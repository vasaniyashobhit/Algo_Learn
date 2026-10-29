import { createHash, timingSafeEqual } from 'node:crypto';
import { ForbiddenError } from '../errors/httpErrors.js';
import { codes } from '../errors/codes.js';

export const CRON_SECRET_HEADER = 'x-cron-secret';

const digest = (value) => createHash('sha256').update(value).digest();

/** Constant-time compare (hashing first gives both sides the same length). */
export const secretsMatch = (given, expected) =>
  typeof given === 'string' && typeof expected === 'string' && expected.length > 0
  && timingSafeEqual(digest(given), digest(expected));

/** Lets a request through only with `x-cron-secret: <secret>`. No secret configured → always 403. */
export const createRequireCronSecret = (secret) => (req, _res, next) => {
  if (secretsMatch(req.get(CRON_SECRET_HEADER), secret)) return next();
  return next(new ForbiddenError(codes.FORBIDDEN, 'Missing or invalid cron secret'));
};
