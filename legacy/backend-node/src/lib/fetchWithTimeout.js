import { ExternalServiceError } from '../errors/httpErrors.js';
import { codes } from '../errors/codes.js';

export const DEFAULT_TIMEOUT_MS = 10_000;

/**
 * Factory for a fetch that aborts after `timeoutMs`. Failures are re-thrown as
 * ExternalServiceError (`errorCode`, default URL_FETCH_FAILED) with the original as `cause`.
 */
export const createFetchWithTimeout = ({
  fetchImpl = globalThis.fetch,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  errorCode = codes.URL_FETCH_FAILED,
} = {}) => async (url, { timeoutMs: callTimeoutMs = timeoutMs, signal, ...init } = {}) => {
  const timeoutSignal = AbortSignal.timeout(callTimeoutMs);
  const combined = signal ? AbortSignal.any([signal, timeoutSignal]) : timeoutSignal;
  try {
    return await fetchImpl(url, { ...init, signal: combined });
  } catch (err) {
    if (timeoutSignal.aborted) {
      throw new ExternalServiceError(errorCode, `Request timed out after ${callTimeoutMs}ms`,
        { reason: 'timeout', timeoutMs: callTimeoutMs }, { statusCode: 503, cause: err });
    }
    const reason = signal?.aborted ? 'aborted' : 'network';
    throw new ExternalServiceError(errorCode, 'The request could not be completed', { reason }, {
      cause: err,
    });
  }
};

export const fetchWithTimeout = createFetchWithTimeout();
