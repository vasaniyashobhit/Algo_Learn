import { AuthError } from '../../../errors/httpErrors.js';
import { codes } from '../../../errors/codes.js';

/** A valid token whose account is gone is treated like a bad token, so the client logs out. */
export const accountGone = () => new AuthError(codes.AUTH_INVALID_TOKEN, 'This account no longer exists');
