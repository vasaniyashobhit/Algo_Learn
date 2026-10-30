import { testUser } from './fixtures.js';

export const SYNCED_AT = '2026-10-30T08:00:00.000Z';

export const linkedUser = { ...testUser, cfHandle: 'ananya_k', cfRating: 1487, cfMaxRating: 1520, lastSyncedAt: SYNCED_AT };

export const topicStat = (topicKey, overrides = {}) => ({
  topicKey,
  kind: topicKey.includes('+') ? 'pair' : 'single',
  tags: topicKey.split('+'),
  attempted: 10,
  solved: 6,
  failed: 4,
  strength: 0.6,
  comfortRating: 1400,
  avgSolvedRating: 1350,
  maxSolvedRating: 1600,
  lastActivityAt: SYNCED_AT,
  ...overrides,
});

/** 30 UTC days ending 2026-10-30; `days` overrides { [index]: { submissions, accepted } }. */
export const activity = (days = {}) =>
  Array.from({ length: 30 }, (_, index) => {
    const date = new Date(Date.UTC(2026, 9, 1 + index)).toISOString().slice(0, 10);
    return { date, submissions: 0, accepted: 0, ...days[index] };
  });

const ZERO_TOTALS = { submissions: 0, problemsAttempted: 0, problemsSolved: 0, topicsAttempted: 0, pairsTracked: 0 };

export const emptySummary = (reason, meta = {}) => ({
  data: { totals: ZERO_TOTALS, strongest: [], weakest: [], solvedByRating: { bands: [], unrated: 0 }, activity: activity() },
  meta: { cfHandle: null, cfRating: null, lastSyncedAt: null, reason, ...meta },
});

export const syncedSummary = {
  data: {
    totals: { submissions: 1310, problemsAttempted: 449, problemsSolved: 412, topicsAttempted: 31, pairsTracked: 212 },
    strongest: [topicStat('implementation', { strength: 0.78 })],
    weakest: [
      topicStat('probabilities', { strength: 0.18, solved: 2, attempted: 6 }),
      topicStat('dsu', { strength: 0.42, solved: 3, attempted: 9 }),
    ],
    solvedByRating: { bands: [], unrated: 0 },
    activity: activity({ 2: { submissions: 3, accepted: 2 }, 5: { submissions: 2, accepted: 0 }, 9: { submissions: 6, accepted: 5 } }),
  },
  meta: { cfHandle: 'ananya_k', cfRating: 1487, lastSyncedAt: SYNCED_AT },
};

export const RADAR_TOPICS = ['greedy', 'math', 'implementation', 'brute force', 'constructive algorithms', 'binary search', 'dp', 'graphs'];

export const radarStats = RADAR_TOPICS.map((topic, index) =>
  topicStat(topic, { strength: [0.69, 0.71, 0.78, 0.74, 0.52, 0.47, 0.38, 0.41][index], attempted: 60 - index * 5 }),
);

export const pairStats = [
  topicStat('bitmasks+dp', { strength: 0.21, attempted: 8, solved: 2 }),
  topicStat('dp+math', { strength: 0.7, attempted: 12, solved: 9 }),
  topicStat('greedy+math', { strength: 0.66, attempted: 20, solved: 14 }),
  topicStat('dsu+graphs', { strength: 0.3, attempted: 5, solved: 2 }),
  topicStat('dp+graphs', { strength: 0.5, attempted: 2, solved: 1 }),
];

export const problem = (id, overrides = {}) => {
  const [contestId, index] = id.split('/');
  return { id, contestId: Number(contestId), index, title: `Problem ${id}`, rating: 1700, tags: ['dp'], hasEditorial: true, source: 'hf', ...overrides };
};

export const recTopic = (topic, problems, overrides = {}) => ({
  topic,
  basis: 'learning_zone',
  strength: 0.38,
  attempted: 52,
  solved: 20,
  comfortRating: 1500,
  frequency: 0.31,
  priority: 0.2,
  reason: `You've solved 20 of 52 ${topic} problems; ${topic} shows up in 31% of problems at your level`,
  targetRange: { min: 1600, max: 1800 },
  problems,
  ...overrides,
});

export const recommendations = (topics, meta = {}) => ({
  data: { topics },
  meta: { userRating: 1487, frequencyRating: 1487, coldStart: false, recentFailed: 10, ...meta },
});

export const practiceItem = (problemId, overrides = {}) => ({
  id: `item-${problemId}`,
  problemId,
  status: 'todo',
  addedFrom: 'recommendation',
  createdAt: SYNCED_AT,
  updatedAt: SYNCED_AT,
  problem: problem(problemId),
  ...overrides,
});
