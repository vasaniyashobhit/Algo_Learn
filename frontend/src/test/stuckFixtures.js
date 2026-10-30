import { problem } from './dashboardFixtures.js';

export const STUCK_ID = '6720f0c2a1b2c3d4e5f60718';

const gapItem = (topicKey, status, strength, overrides = {}) => ({
  topicKey,
  kind: topicKey.includes('+') ? 'pair' : 'single',
  strength,
  status,
  attempted: strength === null ? 0 : 14,
  message: status === 'unseen' ? `You have not practised ${topicKey} yet.` : `You solved 4 of 14 ${topicKey} problems.`,
  ...overrides,
});

/** A POST /stuck (or GET /stuck/:id) result; `source: 'ai'` unless overridden. */
export const stuckResult = (overrides = {}) => ({
  id: STUCK_ID,
  inputType: 'url',
  createdAt: '2026-10-30T01:12:00.000Z',
  source: 'ai',
  provider: 'gemini',
  model: 'gemini-3.5-flash-lite',
  notice: null,
  fallbackReason: null,
  problem: {
    matchedProblemId: '1811/G2',
    requestedProblemId: '1811/G2',
    title: 'Vlad and the Nice Paths (hard version)',
    tags: ['combinatorics', 'dp', 'math'],
    tagsSource: 'db',
    rating: 2200,
  },
  hints: ['Let $$$dp_i$$$ be the longest nice path ending at tile $$$i$$$.', 'Walk left counting tiles of colour $$$c_i$$$.', 'Precompute binomials up to 5000.'],
  hasSolution: true,
  editorialAvailable: true,
  gap: {
    message: 'This problem needs combinatorics and dp. You are weak on combinatorics.',
    items: [gapItem('combinatorics', 'weak', 0.29), gapItem('combinatorics+dp', 'unseen', null)],
    topics: [],
  },
  similar: {
    items: [problem('1811/G1', { title: 'Vlad and the Nice Paths (easy version)', rating: 1700 }), problem('474/D', { title: 'Flowers' })],
    easier: true,
    targetRating: 2050,
    strategies: ['primary'],
  },
  ...overrides,
});

export const fallbackResult = (overrides = {}) =>
  stuckResult({
    source: 'fallback',
    provider: null,
    model: null,
    notice: 'AI solution temporarily unavailable.',
    fallbackReason: 'AI_BUSY',
    hasSolution: false,
    hints: ['This problem most likely uses dp.', 'Review combinatorics first.'],
    ...overrides,
  });

export const aiSolution = (overrides = {}) => ({
  id: STUCK_ID,
  kind: 'ai',
  solution: {
    approach: 'Count paths with a **dp** over the last block.',
    solutionSteps: ['Scan $$$j$$$ down from $$$i$$$.', 'Keep the best length per $$$i$$$.'],
    complexity: 'O(n^2)',
    code: 'int main() { return 0; }',
    pitfalls: ['Take everything modulo 10^9+7.'],
  },
  editorial: 'Let $$$dp_i$$$ be the maximum number of blocks.',
  notice: null,
  similarWithEditorial: [],
  ...overrides,
});

/** A GET /stuck/history item. */
export const historyItem = (id, title, overrides = {}) => ({
  id,
  inputType: 'url',
  createdAt: '2026-10-30T01:12:00.000Z',
  source: 'ai',
  problem: { matchedProblemId: null, requestedProblemId: null, title, tags: ['dp'], tagsSource: 'db', rating: 1700 },
  gapTopics: ['dp'],
  ...overrides,
});
