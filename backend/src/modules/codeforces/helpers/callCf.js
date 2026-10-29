import { AppError } from '../../../errors/AppError.js';
import { ExternalServiceError } from '../../../errors/httpErrors.js';
import { codes } from '../../../errors/codes.js';

/**
 * Runs a Codeforces call. Typed errors from the client (CF_HANDLE_NOT_FOUND, CF_UNAVAILABLE)
 * pass through; anything else means Codeforces could not be reached → 503 CF_UNAVAILABLE.
 */
export const callCf = async (task) => {
  try {
    return await task();
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new ExternalServiceError(codes.CF_UNAVAILABLE, 'Codeforces is unavailable right now', null, {
      statusCode: 503,
      cause: err,
    });
  }
};
