import { rateLimit } from 'express-rate-limit';
import { RateLimitError } from '../errors/httpErrors.js';
import { codes } from '../errors/codes.js';

export const DEFAULT_RATE_LIMIT = Object.freeze({ windowMs: 15 * 60 * 1000, limit: 300 });

/** Stricter limit for /auth/* (signup/login brute force). */
export const AUTH_RATE_LIMIT = Object.freeze({ windowMs: 15 * 60 * 1000, limit: 20 });

/** Key for per-user limits; mount after requireAuth so `req.user` is set. */
export const userKey = (req) => `user:${req.user.id}`;

/**
 * Rate limiter whose rejections flow through errorHandler as RATE_LIMITED (429). Keyed by IP
 * unless `keyGenerator` is given (e.g. userKey).
 */
export const createRateLimiter = ({ windowMs, limit, keyGenerator } = DEFAULT_RATE_LIMIT) =>
  rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    ...(keyGenerator && { keyGenerator }),
    handler: (_req, _res, next, options) => {
      const retryAfterSeconds = Math.ceil(options.windowMs / 1000);
      next(new RateLimitError(codes.RATE_LIMITED, 'Too many requests, please slow down', {
        retryAfterSeconds,
      }));
    },
  });
