import { AppError } from '../../errors/AppError.js';
import { codes } from '../../errors/codes.js';

const sortedKey = (tags = []) => [...tags].sort().join(',');

/** True when CF now reports a different rating or tag set (tag order is ignored). */
export const hasChanged = (row, fresh) =>
  (row.rating ?? null) !== (fresh.rating ?? null) || sortedKey(row.tags) !== sortedKey(fresh.tags);

/**
 * `updateOne` operations for existing cf_api rows whose rating or tags differ from `docs`.
 * Only rating, tags, tagCount and updatedAt are set; the filter re-checks `source: "cf_api"`
 * so hf rows (and their text) are never touched.
 */
export const buildCfApiUpdates = (rows, docs, now = new Date()) => {
  const fresh = new Map(docs.map((doc) => [doc._id, doc]));
  return rows
    .filter((row) => fresh.has(row._id) && hasChanged(row, fresh.get(row._id)))
    .map((row) => {
      const { rating, tags } = fresh.get(row._id);
      return {
        updateOne: {
          filter: { _id: row._id, source: 'cf_api' },
          update: { $set: { rating, tags, tagCount: tags.length, updatedAt: now } },
          timestamps: false,
        },
      };
    });
};

/** Applies rating/tag changes from Codeforces to cf_api rows. Returns how many changed. */
export const updateCfApiRows = async (model, docs) => {
  try {
    const rows = await model.find({ source: 'cf_api' }, { rating: 1, tags: 1 }).lean();
    const operations = buildCfApiUpdates(rows, docs);
    if (!operations.length) return 0;
    const result = await model.bulkWrite(operations, { ordered: false });
    return result.modifiedCount;
  } catch (err) {
    throw new AppError(500, codes.INTERNAL_ERROR, 'Updating cf_api problems failed', null, { cause: err });
  }
};
