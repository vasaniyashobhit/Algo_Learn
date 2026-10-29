const RETRYABLE_STATUSES = new Set([429, 500, 502, 503, 504]);
const NETWORK_CODES = new Set([
  'ECONNRESET', 'ECONNREFUSED', 'ECONNABORTED', 'ETIMEDOUT', 'ENOTFOUND', 'EAI_AGAIN', 'EPIPE',
  'UND_ERR_CONNECT_TIMEOUT', 'UND_ERR_HEADERS_TIMEOUT', 'UND_ERR_BODY_TIMEOUT', 'UND_ERR_SOCKET',
]);
const TIMEOUT_NAMES = new Set(['TimeoutError', 'AbortError']);

const statusOf = (err) => Number(err.status ?? err.statusCode ?? err.response?.status);

const isNetworkError = (err) =>
  NETWORK_CODES.has(err.code) || NETWORK_CODES.has(err.cause?.code)
  || (err instanceof TypeError && /fetch failed|network/i.test(err.message));

/** Worth retrying the same model: 429, 500, 502, 503, 504, timeouts and network failures. */
export const isRetryable = (err) => {
  if (!err || typeof err !== 'object') return false;
  if (RETRYABLE_STATUSES.has(statusOf(err))) return true;
  if (TIMEOUT_NAMES.has(err.name) || err.reason === 'timeout' || err.reason === 'network') return true;
  return isNetworkError(err);
};
