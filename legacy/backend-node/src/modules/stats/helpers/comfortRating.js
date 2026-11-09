import { STATS } from '../../../config/constants.js';
import { DAY_MS } from './decay.js';

/** Median of a non-empty list (mean of the two middle values when the length is even). */
export const median = (values) => {
  const sorted = values.toSorted((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

/**
 * Highest rating the user reliably solves in a topic. `solves` = rated solves `{ rating, at }`.
 * ≥ 3 solves in the last 365 days → median of the top 5 of them (rounded). Otherwise
 * min(userRating, max solved ever), or whichever of the two is known (null if neither).
 */
export const comfortRating = (solves, userRating, now, settings = STATS) => {
  const cutoff = now - settings.comfortWindowDays * DAY_MS;
  const recent = solves.filter(({ at }) => at >= cutoff).map(({ rating }) => rating);
  if (recent.length >= settings.comfortMinSolves) {
    return Math.round(median(recent.toSorted((a, b) => b - a).slice(0, settings.comfortTopN)));
  }
  const maxSolved = solves.length ? Math.max(...solves.map(({ rating }) => rating)) : null;
  if (maxSolved === null) return userRating ?? null;
  return userRating === null || userRating === undefined ? maxSolved : Math.min(userRating, maxSolved);
};
