import mongoose from 'mongoose';

let seq = 0;
const next = () => {
  seq += 1;
  return seq;
};

export const objectId = () => new mongoose.Types.ObjectId();

export const makeProblem = (overrides = {}) => {
  const contestId = next();
  return {
    _id: `${contestId}/A`,
    contestId,
    index: 'A',
    title: `Problem ${contestId}`,
    description: 'Given an array of n integers, find the maximum sum.',
    rating: 1200,
    tags: ['dp', 'greedy'],
    ...overrides,
  };
};

export const makeUser = (overrides = {}) => {
  const n = next();
  return { email: `user${n}@example.com`, passwordHash: '$2b$10$hash', name: `User ${n}`, ...overrides };
};

export const makeSubmission = (overrides = {}) => {
  const n = next();
  return {
    cfSubmissionId: n,
    userId: objectId(),
    problemId: `${n}/B`,
    contestId: n,
    index: 'B',
    problemRating: 1400,
    problemTags: ['math'],
    verdict: 'OK',
    submittedAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  };
};

export const makeTopicStat = (overrides = {}) => ({
  userId: objectId(),
  topicKey: 'dp',
  kind: 'single',
  ...overrides,
});

export const makeStuckQuery = (overrides = {}) => ({
  userId: objectId(),
  inputType: 'text',
  rawInput: 'You are given a tree with n vertices...',
  source: 'fallback',
  ...overrides,
});

export const makeLlmCache = (overrides = {}) => ({
  key: `cache-${next()}`,
  provider: 'gemini',
  model: 'gemini-a',
  response: { tags: ['dp'], hints: ['Think about prefixes'] },
  ...overrides,
});

export const makePracticeItem = (overrides = {}) => ({
  userId: objectId(),
  problemId: `${next()}/C`,
  ...overrides,
});
