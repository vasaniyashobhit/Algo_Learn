import { STATS_VIEW } from '../../../config/constants.js';

const bandStarts = ({ minBandRating, maxBandRating, bandSize }) =>
  Array.from({ length: (maxBandRating - minBandRating) / bandSize + 1 }, (_, i) => minBandRating + i * bandSize);

const bandOf = (rating, { minBandRating, maxBandRating, bandSize }) => {
  const start = minBandRating + Math.floor((rating - minBandRating) / bandSize) * bandSize;
  return Math.min(maxBandRating, Math.max(minBandRating, start));
};

/**
 * Solved problems per rating band. Every band is listed (zeros included) so a chart is never
 * empty; ratings outside the range fall into the first/last band, unrated ones into `unrated`.
 */
export const solvedByRating = (problems, settings = STATS_VIEW) => {
  const counts = new Map(bandStarts(settings).map((from) => [from, 0]));
  let unrated = 0;
  for (const { solved, rating } of problems) {
    if (!solved) continue;
    if (rating === null || rating === undefined) {
      unrated += 1;
      continue;
    }
    const from = bandOf(rating, settings);
    counts.set(from, counts.get(from) + 1);
  }
  const bands = [...counts].map(([from, solved]) => ({ from, to: from + settings.bandSize - 1, solved }));
  return { bands, unrated };
};
