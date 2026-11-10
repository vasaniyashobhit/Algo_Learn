import { NotFoundError } from '../../../legacy/backend-node/src/errors/httpErrors.js';
import { codes } from '../../../legacy/backend-node/src/errors/codes.js';
import { problemDocs } from './seedProblems.js';

/** Any handle starting with `e2e_` exists, so parallel tests can each link their own. */
export const isFakeHandle = (handle) => /^e2e_\w+$/i.test(String(handle));

const DAY = 86_400;
// Index into the seeded problems → verdicts, oldest first (WA before the eventual OK).
const PLAN = [
  [1, ['OK']], [2, ['WRONG_ANSWER', 'OK']], [3, ['WRONG_ANSWER', 'TIME_LIMIT_EXCEEDED']],
  [4, ['OK']], [5, ['WRONG_ANSWER']], [6, ['OK']], [7, ['OK']], [8, ['WRONG_ANSWER', 'OK']],
  [9, ['OK']], [10, ['WRONG_ANSWER']], [11, ['OK']], [12, ['OK']], [13, ['WRONG_ANSWER', 'WRONG_ANSWER']],
  [14, ['OK']], [16, ['OK']], [17, ['OK']], [18, ['OK']], [20, ['WRONG_ANSWER']], [21, ['OK']],
];

/** A newest-first submission history (CF user.status shape) spread over the last 30 days. */
export const fakeHistory = (baseId = 900_000, nowSeconds = Math.floor(Date.now() / 1000)) => {
  const problems = problemDocs();
  const oldestFirst = PLAN.flatMap(([at, verdicts]) => verdicts.map((verdict) => ({ problem: problems[at], verdict })));
  return oldestFirst.map(({ problem, verdict }, i) => ({
    id: baseId + i,
    contestId: problem.contestId,
    creationTimeSeconds: nowSeconds - (oldestFirst.length - i) * Math.floor(DAY * 1.4),
    problem: { contestId: problem.contestId, index: problem.index, name: problem.title, rating: problem.rating, tags: problem.tags },
    verdict,
  })).reverse();
};

/**
 * Fake Codeforces client with the real client's interface. Never touches the network.
 * Submission ids are global on Codeforces (unique in our DB), so each handle gets its own range.
 */
export const createFakeCodeforces = () => {
  const histories = new Map();
  const historyOf = (handle) => {
    const key = String(handle).toLowerCase();
    if (!histories.has(key)) histories.set(key, fakeHistory(1_000_000 + histories.size * 1_000));
    return histories.get(key);
  };
  return {
    userInfo: async (handles) => [handles].flat().map((handle) => {
      if (!isFakeHandle(handle)) throw new NotFoundError(codes.CF_HANDLE_NOT_FOUND, 'Codeforces handle not found');
      return { handle, rating: 1450, maxRating: 1580, rank: 'specialist', maxRank: 'specialist' };
    }),
    userStatus: async (handle, from = 1, count = 1_000) => historyOf(handle).slice(from - 1, from - 1 + count),
    problemsetProblems: async () => ({ problems: [], problemStatistics: [] }),
  };
};
