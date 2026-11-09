/** Stats constants (Session 7), re-exported by constants.js: import them from there. */

/**
 * Topic strength (F8). Solved: d·(solvedBase + w), unsolved: d·(failBase − w), with
 * d = 0.5^(ageDays / halfLifeDays) and w = sigmoid((problemRating − userRating) / difficultyScale).
 * strength = (solved + prior·priorMean) / (solved + failed + prior).
 */
export const STATS = Object.freeze({
  halfLifeDays: 90,
  difficultyScale: 300,
  neutralWeight: 0.5,
  solvedBase: 0.5,
  failBase: 1.5,
  prior: 3,
  priorMean: 0.5,
  minPairAttempts: 2,
  comfortWindowDays: 365,
  comfortTopN: 5,
  comfortMinSolves: 3,
  lastResults: 5,
});

/** GET /users/me/stats and /stats/summary. Rating bands are [from, from + bandSize − 1]. */
export const STATS_VIEW = Object.freeze({
  sorts: Object.freeze(['strength', 'attempted']),
  defaultLimit: 50,
  maxLimit: 630,
  topN: 5,
  minWeakAttempts: 3,
  activityDays: 30,
  bandSize: 200,
  minBandRating: 800,
  maxBandRating: 3400,
});

/** `meta.reason` when a stats response is empty on purpose (not an error). */
export const STATS_EMPTY_REASONS = Object.freeze({ noHandle: 'NO_HANDLE', notSynced: 'NOT_SYNCED' });
