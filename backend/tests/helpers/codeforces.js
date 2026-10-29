import { vi } from 'vitest';
import { ExternalServiceError, NotFoundError } from '../../src/errors/httpErrors.js';
import { codes } from '../../src/errors/codes.js';

/** A CF API Submission object (newest submissions have the largest ids). */
export const cfSubmission = (id, overrides = {}) => ({
  id,
  contestId: 1000 + (id % 7),
  creationTimeSeconds: 1_700_000_000 + id,
  problem: { contestId: 1000 + (id % 7), index: 'A', name: `P${id}`, rating: 1500, tags: ['dp', 'math'] },
  verdict: 'OK',
  ...overrides,
});

/** `count` submissions with ids count..1 (newest first, like user.status). */
export const cfHistory = (count, start = 1) =>
  Array.from({ length: count }, (_, i) => cfSubmission(start + count - 1 - i));

export const cfUser = (handle, overrides = {}) => ({ handle, rating: 1650, maxRating: 1800, ...overrides });

export const cfDown = () => new ExternalServiceError(codes.CF_UNAVAILABLE, 'Codeforces answered HTTP 503',
  { status: 503, retryable: true }, { statusCode: 503 });

/**
 * Fake Codeforces client. `users` maps lower-cased handles to user.info objects;
 * `submissions` is the newest-first history user.status pages through.
 */
export const fakeCfClient = ({ users = {}, submissions = [], problems = [] } = {}) => ({
  userInfo: vi.fn(async (handle) => {
    const info = users[String(handle).toLowerCase()];
    if (!info) throw new NotFoundError(codes.CF_HANDLE_NOT_FOUND, 'Codeforces handle not found');
    return [info];
  }),
  userStatus: vi.fn(async (_handle, from = 1, count = submissions.length) =>
    submissions.slice(from - 1, from - 1 + count)),
  problemsetProblems: vi.fn(async () => ({ problems, problemStatistics: [] })),
});
