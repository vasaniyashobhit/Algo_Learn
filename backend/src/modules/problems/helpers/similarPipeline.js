import { SPECIAL_TAG } from '../../../config/tags.js';
import { SIMILARITY } from '../../../config/constants.js';
import { SUMMARY_FIELDS } from './problemView.js';

// Sorts unrated problems (no distance) after every rated one.
const NO_DISTANCE = Number.MAX_SAFE_INTEGER;

const buildMatch = ({ tags, useTags, filterRating, target, window, excludeIds, excludeTitles }) => {
  const match = {};
  if (excludeIds.length) match._id = { $nin: excludeIds };
  if (excludeTitles.length) match.title = { $nin: excludeTitles };
  if (useTags) match.tags = { $in: tags };
  if (filterRating) match.rating = { $gte: target - window, $lte: target + window };
  return match;
};

const distanceExpr = (target) =>
  target === null
    ? { $literal: null }
    : { $cond: [{ $isNumber: '$rating' }, { $abs: { $subtract: ['$rating', target] } }, null] };

/**
 * Pure builder for the similar-problems aggregation. Every value must come from validated
 * input or our own constants (aggregate() is not covered by sanitizeFilter).
 * `tags` are topic tags only; `target` is the rating to be close to (or null).
 */
export const buildSimilarPipeline = ({
  tags, target = null, window, k, useTags = true, filterRating = false,
  excludeIds = [], excludeTitles = [],
}) => [
  { $match: buildMatch({ tags, useTags, filterRating, target, window, excludeIds, excludeTitles }) },
  { $addFields: { _topic: { $setDifference: [{ $ifNull: ['$tags', []] }, [SPECIAL_TAG]] } } },
  {
    $addFields: {
      _inter: { $size: { $setIntersection: ['$_topic', tags] } },
      _union: { $size: { $setUnion: ['$_topic', tags] } },
      _distance: distanceExpr(target),
    },
  },
  {
    $addFields: {
      jaccard: { $cond: [{ $eq: ['$_union', 0] }, 0, { $divide: ['$_inter', '$_union'] }] },
      ratingCloseness: {
        $cond: [
          { $eq: ['$_distance', null] },
          0,
          { $max: [0, { $subtract: [1, { $divide: ['$_distance', window] }] }] },
        ],
      },
      _sortDistance: { $ifNull: ['$_distance', NO_DISTANCE] },
    },
  },
  {
    $addFields: {
      score: {
        $add: [
          { $multiply: [SIMILARITY.jaccardWeight, '$jaccard'] },
          { $multiply: [SIMILARITY.ratingWeight, '$ratingCloseness'] },
        ],
      },
    },
  },
  { $sort: { score: -1, ratingCloseness: -1, _sortDistance: 1, _id: 1 } },
  { $limit: k },
  {
    $project: {
      ...Object.fromEntries(SUMMARY_FIELDS.map((field) => [field, 1])),
      similarity: { score: '$score', jaccard: '$jaccard', ratingCloseness: '$ratingCloseness' },
    },
  },
];
