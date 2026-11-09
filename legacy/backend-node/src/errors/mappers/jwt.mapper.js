import { AuthError } from '../httpErrors.js';
import { codes } from '../codes.js';

const INVALID_TOKEN_ERRORS = new Set(['JsonWebTokenError', 'NotBeforeError']);

export const mapJwtError = (err) => {
  if (err?.name === 'TokenExpiredError') {
    return new AuthError(codes.AUTH_TOKEN_EXPIRED, 'Your session has expired', null, { cause: err });
  }
  if (INVALID_TOKEN_ERRORS.has(err?.name)) {
    return new AuthError(codes.AUTH_INVALID_TOKEN, 'Invalid authentication token', null, {
      cause: err,
    });
  }
  return null;
};
