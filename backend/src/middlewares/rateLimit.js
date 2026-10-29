import { rateLimit } from 'express-rate-limit';
import { RateLimitError } from '../errors/httpErrors.js';
import { codes } from '../errors/codes.js';

export const DEFAULT_RATE_LIMIT = Object.freeze({ windowMs: 15 * 60 * 1000, limit: 300 });

/** Stricter limit for /auth/* (signup/login brute force). */
export const AUTH_RATE_LIMIT = Object.freeze({ windowMs: 15 * 60 * 1000, limit: 20 });

/** Rate limiter whose rejections flow through errorHandler as RATE_LIMITED (429). */
export const createRateLimiter = ({ windowMs, limit } = DEFAULT_RATE_LIMIT) =>
  rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: (_req, _res, next, options) => {
      const retryAfterSeconds = Math.ceil(options.windowMs / 1000);
      next(new RateLimitError(codes.RATE_LIMITED, 'Too many requests, please slow down', {
        retryAfterSeconds,
      }));
    },
  });
