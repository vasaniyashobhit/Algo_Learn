import { ExternalServiceError, NotFoundError } from '../../../errors/httpErrors.js';
import { codes } from '../../../errors/codes.js';

const unavailable = (message, details, { statusCode = 503, cause } = {}) =>
  new ExternalServiceError(codes.CF_UNAVAILABLE, message, details, { statusCode, cause });

/** Maps a `"status": "FAILED"` body (its `comment`) to a typed error. */
export const failedStatusError = (comment = '') => {
  if (/handles?:.*not found/i.test(comment)) {
    return new NotFoundError(codes.CF_HANDLE_NOT_FOUND, 'Codeforces handle not found', { comment });
  }
  if (/call limit exceeded/i.test(comment)) {
    return unavailable('Codeforces rate limit reached', { comment, retryable: true });
  }
  return unavailable('Codeforces rejected the request', { comment, retryable: false }, { statusCode: 502 });
};

/** 5xx and 429 are worth retrying; other non-JSON HTTP errors are not. */
export const httpStatusError = (status) => {
  const retryable = status >= 500 || status === 429;
  return unavailable(`Codeforces answered HTTP ${status}`, { status, retryable }, {
    statusCode: retryable ? 503 : 502,
  });
};

export const invalidBodyError = (status, cause) =>
  unavailable('Codeforces sent an unreadable response', { status, retryable: status >= 500 }, {
    statusCode: 502,
    cause,
  });

/** Retry timeouts, network failures, 5xx/429 and CF's call-limit FAILED status. */
export const isRetryableCfError = (err) => {
  const details = err?.details ?? {};
  return details.retryable === true || details.reason === 'timeout' || details.reason === 'network';
};
