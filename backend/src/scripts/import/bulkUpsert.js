import { AppError } from '../../errors/AppError.js';
import { codes } from '../../errors/codes.js';

export const BATCH_SIZE = 500;

export const chunk = (items, size) => {
  if (!Number.isInteger(size) || size < 1) throw new TypeError('size must be a positive integer');
  return Array.from({ length: Math.ceil(items.length / size) }, (_, i) =>
    items.slice(i * size, (i + 1) * size));
};

/**
 * `$set` overwrites existing fields (dataset import); `$setOnInsert` only fills brand-new
 * documents and never touches existing ones (API sync). Mongoose's automatic timestamps
 * would bump updatedAt on every match (so a re-run would "modify" every row); instead,
 * timestamps are only written on insert and `modifiedCount` means real content changes.
 */
const toOperation = (operator, now) => ({ _id, ...fields }) => {
  const stamps = { createdAt: now, updatedAt: now };
  const update = operator === '$setOnInsert'
    ? { $setOnInsert: { ...fields, ...stamps } }
    : { [operator]: fields, $setOnInsert: stamps };
  return { updateOne: { filter: { _id }, update, upsert: true, timestamps: false } };
};

/**
 * Upserts docs by `_id` in unordered batches. Idempotent: re-running with the same docs
 * creates nothing new. Returns totals across batches.
 */
export const bulkUpsert = async (model, docs, {
  batchSize = BATCH_SIZE,
  operator = '$set',
  onBatch,
} = {}) => {
  const totals = { batches: 0, upserted: 0, modified: 0, matched: 0 };
  for (const [batchIndex, batch] of chunk(docs, batchSize).entries()) {
    try {
      const operations = batch.map(toOperation(operator, new Date()));
      const result = await model.bulkWrite(operations, { ordered: false });
      totals.batches += 1;
      totals.upserted += result.upsertedCount;
      totals.modified += result.modifiedCount;
      totals.matched += result.matchedCount;
      onBatch?.({ batchIndex, size: batch.length, totals: { ...totals } });
    } catch (err) {
      throw new AppError(500, codes.INTERNAL_ERROR, `Bulk upsert failed in batch ${batchIndex}`,
        { batchIndex, batchSize: batch.length }, { cause: err });
    }
  }
  return totals;
};
