import { TOPIC_TAGS, isTopicTag } from '../../../config/tags.js';
import { RECOMMENDATIONS } from '../../../config/constants.js';

/**
 * Aggregation for the per-rating tag counts (independent of any user, so it is cached).
 * Only rated problems count; `*special` and unknown tags are dropped in toTagCounts.
 */
export const tagCountsPipeline = () => [
  { $match: { rating: { $type: 'number' } } },
  {
    $facet: {
      totals: [{ $group: { _id: '$rating', total: { $sum: 1 } } }],
      tags: [
        { $unwind: '$tags' },
        { $group: { _id: { rating: '$rating', tag: '$tags' }, count: { $sum: 1 } } },
      ],
    },
  },
];

/** Shapes the $facet result into `[{ rating, total, tags: { [tag]: count } }]`, sorted by rating. */
export const toTagCounts = ([facet] = []) => {
  const byRating = new Map((facet?.totals ?? []).map(({ _id, total }) => [_id, { rating: _id, total, tags: {} }]));
  for (const { _id: { rating, tag }, count } of facet?.tags ?? []) {
    const row = byRating.get(rating);
    if (row && isTopicTag(tag)) row.tags[tag] = count;
  }
  return [...byRating.values()].toSorted((a, b) => a.rating - b.rating);
};

/**
 * Share (0–1) of the problems rated within ±window of `userRating` (1200 when unknown) that
 * carry each of the 36 topic tags. `total` is the number of problems in that window.
 */
export const topicFrequencyAtRating = (
  tagCounts,
  userRating,
  window = RECOMMENDATIONS.frequencyWindow,
) => {
  const rating = userRating ?? RECOMMENDATIONS.defaultRating;
  const rows = tagCounts.filter((row) => Math.abs(row.rating - rating) <= window);
  const total = rows.reduce((sum, row) => sum + row.total, 0);
  const counts = (tag) => rows.reduce((sum, row) => sum + (row.tags[tag] ?? 0), 0);
  const frequency = Object.fromEntries(TOPIC_TAGS.map((tag) => [tag, total ? counts(tag) / total : 0]));
  return { rating, total, frequency };
};
