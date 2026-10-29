import mongoose from 'mongoose';

const ratingRange = (minRating, maxRating) => ({
  ...(minRating !== undefined && { $gte: minRating }),
  ...(maxRating !== undefined && { $lte: maxRating }),
});

/**
 * Find filter for GET /problems, built only from zod-validated values. Operators are wrapped
 * in mongoose.trusted() because sanitizeFilter is global.
 */
export const buildListFilter = ({ tags = [], matchAll = false, minRating, maxRating, q } = {}) => {
  const filter = {};
  if (tags.length) filter.tags = mongoose.trusted(matchAll ? { $all: tags } : { $in: tags });
  if (minRating !== undefined || maxRating !== undefined) {
    filter.rating = mongoose.trusted(ratingRange(minRating, maxRating));
  }
  if (q) filter.$text = mongoose.trusted({ $search: q });
  return filter;
};

/** Newest contests first (like the CF problemset); text matches by relevance first. */
export const buildListSort = ({ q } = {}) => ({
  ...(q && { score: { $meta: 'textScore' } }),
  contestId: -1,
  index: 1,
});
