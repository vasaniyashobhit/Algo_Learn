import { AuthError } from '../errors/httpErrors.js';
import { codes } from '../errors/codes.js';

const BEARER = /^Bearer ([A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+)$/;

/** Returns the token from "Authorization: Bearer <token>". Throws AUTH_REQUIRED / AUTH_INVALID_TOKEN. */
export const readBearerToken = (header) => {
  if (!header?.trim()) throw new AuthError(codes.AUTH_REQUIRED, 'Authentication required');
  const match = BEARER.exec(header.trim());
  if (!match) {
    throw new AuthError(codes.AUTH_INVALID_TOKEN, 'Authorization header must be "Bearer <token>"');
  }
  return match[1];
};

/** requireAuth: verifies the Bearer token and sets `req.user = { id, email }`. */
export const createRequireAuth = (tokens) => async (req, _res, next) => {
  try {
    req.user = tokens.verify(readBearerToken(req.headers.authorization));
    next();
  } catch (err) {
    next(err);
  }
};
