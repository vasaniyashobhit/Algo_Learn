import { activityTotals } from './overs.js';

export const RADAR_TOPICS = 8;

// The stats requests the dashboard makes (also prefetched right after login).
export const RADAR_PARAMS = { kind: 'single', sort: 'attempted', limit: RADAR_TOPICS };
export const PAIR_PARAMS = { kind: 'pair', sort: 'attempted', limit: 100 };

/** The 8 most practised topics for the radar and its table, in the API's order (most attempted first). */
export const radarRows = (stats = []) =>
  stats.slice(0, RADAR_TOPICS).map(({ topicKey, strength, attempted, solved }) => ({
    topic: topicKey,
    strength,
    attempted,
    solved,
  }));

/** "Strength on your 8 most practised topics, from 0 to 1. Weakest: dp 0.38, graphs 0.41." */
export const radarSummary = (rows) => {
  const weakest = rows
    .toSorted((a, b) => a.strength - b.strength)
    .slice(0, 2)
    .map((row) => `${row.topic} ${row.strength.toFixed(2)}`);
  return `Strength on your ${rows.length} most practised topics, from 0 to 1. Weakest: ${weakest.join(', ')}.`;
};

/** The scoreboard figures. `rating` is null until the user has a rated contest. */
export const statTiles = ({ totals, activity }, { cfRating } = {}) => {
  const notSolved = Math.max(0, totals.problemsAttempted - totals.problemsSolved);
  return [
    { key: 'rating', label: 'Rating', value: cfRating ?? null },
    { key: 'solved', label: 'Solved', value: totals.problemsSolved },
    { key: 'notSolved', label: 'Tried, not solved', value: notSolved },
    { key: 'active', label: 'Active days · 30 d', value: activityTotals(activity).activeDays },
    { key: 'topics', label: 'Topics tried', value: totals.topicsAttempted },
  ];
};
