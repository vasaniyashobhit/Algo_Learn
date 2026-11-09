import { isTopicTag } from '../../../config/tags.js';
import { SIMILARITY } from '../../../config/constants.js';

/** Unique topic tags only (`*special` and unknown tags dropped), order kept. */
export const topicTagsOf = (tags) => [...new Set((tags ?? []).filter(isTopicTag))];

/** |A ∩ B| / |A ∪ B| over topic tags; 0 when both are empty. */
export const jaccard = (a, b) => {
  const left = new Set(topicTagsOf(a));
  const right = topicTagsOf(b);
  const shared = right.filter((tag) => left.has(tag)).length;
  const union = left.size + right.length - shared;
  return union === 0 ? 0 : shared / union;
};

const isRating = (value) => typeof value === 'number' && Number.isFinite(value);

/** 1 when equal, falling linearly to 0 at `window` apart; 0 when either rating is missing. */
export const ratingCloseness = (a, b, window = SIMILARITY.defaultRatingWindow) => {
  if (!isRating(a) || !isRating(b)) return 0;
  if (!(window > 0)) return a === b ? 1 : 0;
  return Math.max(0, 1 - Math.abs(a - b) / window);
};

/** Weighted blend; the aggregation pipeline computes exactly the same formula. */
export const similarityScore = (jaccardValue, closeness) =>
  SIMILARITY.jaccardWeight * jaccardValue + SIMILARITY.ratingWeight * closeness;
