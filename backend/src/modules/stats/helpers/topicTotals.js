import { comfortRating } from './comfortRating.js';
import { strength } from './strength.js';

/** Running totals of one topic key while problems are added. */
export const emptyTotals = (topicKey, kind) => ({
  topicKey,
  kind,
  attempted: 0,
  solved: 0,
  solvedScore: 0,
  failScore: 0,
  solves: [],
  lastActivityAt: null,
});

/** Adds one grouped problem and its contribution to `totals` (mutates and returns it). */
export const addProblem = (totals, problem, { solvedScore, failScore }) => {
  totals.attempted += 1;
  totals.solvedScore += solvedScore;
  totals.failScore += failScore;
  if (problem.solved) {
    totals.solved += 1;
    if (Number.isFinite(problem.rating)) totals.solves.push({ rating: problem.rating, at: problem.lastAt });
  }
  if (!totals.lastActivityAt || problem.lastAt > totals.lastActivityAt) totals.lastActivityAt = problem.lastAt;
  return totals;
};

const mean = (values) => values.reduce((sum, value) => sum + value, 0) / values.length;

/** Turns totals into the fields of a `topicstats` document (without `userId`). */
export const toTopicStatDoc = (totals, userRating, now) => {
  const ratings = totals.solves.map(({ rating }) => rating);
  return {
    topicKey: totals.topicKey,
    kind: totals.kind,
    attempted: totals.attempted,
    solved: totals.solved,
    failed: totals.attempted - totals.solved,
    avgSolvedRating: ratings.length ? Math.round(mean(ratings)) : null,
    maxSolvedRating: ratings.length ? Math.max(...ratings) : null,
    comfortRating: comfortRating(totals.solves, userRating, now),
    strength: strength(totals.solvedScore, totals.failScore),
    lastActivityAt: totals.lastActivityAt,
  };
};
