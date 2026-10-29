import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { AuthError } from '../../../errors/httpErrors.js';
import { codes } from '../../../errors/codes.js';
import { mapJwtError } from '../../../errors/mappers/jwt.mapper.js';

export const JWT_ALGORITHM = 'HS256';

const payloadSchema = z.object({
  sub: z.string().regex(/^[a-f\d]{24}$/),
  email: z.string().min(1),
});

/** Signs a JWT for `{ id, email }`: `sub` = user id, plus the email claim. */
export const signToken = ({ id, email }, { secret, expiresIn }) =>
  jwt.sign({ email }, secret, { subject: String(id), expiresIn, algorithm: JWT_ALGORITHM });

/** Verifies a JWT and returns `{ id, email }`. Throws AUTH_TOKEN_EXPIRED or AUTH_INVALID_TOKEN. */
export const verifyToken = (token, { secret }) => {
  let payload;
  try {
    payload = jwt.verify(token, secret, { algorithms: [JWT_ALGORITHM] });
  } catch (err) {
    throw mapJwtError(err)
      ?? new AuthError(codes.AUTH_INVALID_TOKEN, 'Invalid authentication token', null, { cause: err });
  }
  const parsed = payloadSchema.safeParse(payload);
  if (!parsed.success) {
    throw new AuthError(codes.AUTH_INVALID_TOKEN, 'Invalid authentication token');
  }
  return { id: parsed.data.sub, email: parsed.data.email };
};

/** Binds sign/verify to one secret and lifetime. */
export const createTokenService = ({ secret, expiresIn = '7d' }) => {
  if (!secret) throw new TypeError('createTokenService(): a JWT secret is required');
  return {
    sign: (user) => signToken(user, { secret, expiresIn }),
    verify: (token) => verifyToken(token, { secret }),
  };
};
