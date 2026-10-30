const RETRY_STATUSES = new Set([429, 500, 502, 504]);
const TIMEOUT_NAMES = new Set(['TimeoutError', 'AbortError']);

const statusOf = (err) => Number(err.status ?? err.statusCode ?? err.response?.status);

const isTimeout = (err) => TIMEOUT_NAMES.has(err.name) || err.reason === 'timeout';

/**
 * What the chain does after a failed call:
 * - `sick`: timeout or 503 ("high demand") → no retry, next provider now, open the model's circuit;
 * - `retry`: 429, 500, 502, 504 → one more try after a short backoff;
 * - `fail`: anything else (404 model gone, 400, invalid JSON, network error) → next provider.
 */
export const failureKind = (err) => {
  if (!err || typeof err !== 'object') return 'fail';
  if (isTimeout(err) || statusOf(err) === 503) return 'sick';
  if (RETRY_STATUSES.has(statusOf(err))) return 'retry';
  return 'fail';
};
