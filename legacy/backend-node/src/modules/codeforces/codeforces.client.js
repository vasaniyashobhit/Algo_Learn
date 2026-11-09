import { createFetchWithTimeout } from '../../lib/fetchWithTimeout.js';
import { createRateLimitQueue } from '../../lib/rateLimitQueue.js';
import { retry } from '../../lib/retry.js';
import { codes } from '../../errors/codes.js';
import { isRetryableCfError } from './helpers/cfErrors.js';
import { CF_API_BASE_URL, buildCfUrl, parseCfResponse } from './helpers/cfRequest.js';

/** Codeforces asks for at most 1 call per 2 seconds; 2.1 s leaves a small margin. */
export const CF_MIN_INTERVAL_MS = 2_100;
export const CF_TIMEOUT_MS = 20_000;

/**
 * Codeforces API client. Every call goes through the shared rate-limit queue (also on retry),
 * times out, and retries timeouts / network errors / 5xx / call-limit failures.
 * All failures are typed AppErrors (CF_UNAVAILABLE, CF_HANDLE_NOT_FOUND).
 */
export const createCodeforcesClient = ({
  fetchImpl = globalThis.fetch,
  baseUrl = CF_API_BASE_URL,
  timeoutMs = CF_TIMEOUT_MS,
  limiter = createRateLimitQueue({ intervalMs: CF_MIN_INTERVAL_MS }),
  retries = 2,
  retryBaseMs = 1_000,
  sleep,
  logger,
} = {}) => {
  const fetcher = createFetchWithTimeout({ fetchImpl, timeoutMs, errorCode: codes.CF_UNAVAILABLE });

  const call = async (method, params) => {
    const url = buildCfUrl(baseUrl, method, params);
    const attempt = () => limiter(async () => parseCfResponse(await fetcher(url)));
    return retry(attempt, {
      retries,
      baseMs: retryBaseMs,
      shouldRetry: isRetryableCfError,
      sleep,
      onRetry: ({ err, attempt: n, delayMs }) =>
        logger?.warn({ method, attempt: n, delayMs, code: err.code }, 'Retrying Codeforces call'),
    });
  };

  return {
    /** `{ problems, problemStatistics }` for the whole problemset. */
    problemsetProblems: (tags) => call('problemset.problems', { tags }),
    /** User objects for one or more handles (array or single string). */
    userInfo: (handles) => call('user.info', { handles: [handles].flat() }),
    /** Submissions of `handle`, newest first; `from` is 1-based. */
    userStatus: (handle, from = 1, count) => call('user.status', { handle, from, count }),
  };
};
