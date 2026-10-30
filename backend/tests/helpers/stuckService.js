import { vi } from 'vitest';
import { createStuckService } from '../../src/modules/stuck/stuck.service.js';
import { objectId } from './factories.js';

export const USER_ID = String(objectId());

export const dbProblem = (overrides = {}) => ({
  _id: '1/A', title: 'Theatre Square', description: 'Theatre Square in the capital city of Berland.',
  inputFormat: 'n m a', outputFormat: 'one number', note: '', editorial: 'Ceil both sides.\n\nThen multiply.',
  rating: 1000, tags: ['math'], ...overrides,
});

/** Fake repository: problems by id, the $text results, stats rows and the user context. */
export const fakeRepo = ({ problems = [], search = [], stats = [], userRating = 1200, solvedIds = [] } = {}) => ({
  findProblem: vi.fn(async (id) => problems.find(({ _id }) => _id === id) ?? null),
  searchProblems: vi.fn(async () => search),
  topicStats: vi.fn(async () => stats),
  userContext: vi.fn(async () => ({ userRating, solvedIds })),
  saveQuery: vi.fn(async (doc) => ({ ...doc, _id: objectId(), createdAt: new Date('2026-10-30T12:00:00Z') })),
});

export const fakeFindSimilar = () => vi.fn(async ({ rating }) => ({
  items: [{ id: '4/A', title: 'Watermelon', hasEditorial: true }],
  meta: { strategy: 'primary', strategies: ['primary'], targetRating: rating ?? 1200 },
}));

/** solve() with fakes: `resolved` is what the input resolver returns, `coach` what the LLM returns. */
export const stuckService = ({ resolved, coach, repo = fakeRepo(), now = () => 1_000 } = {}) => {
  const deps = {
    resolveInput: vi.fn(async () => resolved),
    getCoachAnswer: vi.fn(async () => coach ?? { answer: null, source: 'fallback', reason: 'AI_UNAVAILABLE' }),
    findSimilar: fakeFindSimilar(),
    repo,
    now,
  };
  return { ...deps, service: createStuckService(deps) };
};
