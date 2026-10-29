import { createTokenService } from './helpers/token.js';
import { createAuthService, DEFAULT_HASH_ROUNDS } from './auth.service.js';
import { createRequireAuth } from '../../middlewares/auth.js';

/** Wires the token service, auth service and requireAuth from one config. */
export const createAuth = ({ jwtSecret, jwtExpiresIn = '7d', hashRounds = DEFAULT_HASH_ROUNDS } = {}) => {
  const tokens = createTokenService({ secret: jwtSecret, expiresIn: jwtExpiresIn });
  return {
    tokens,
    authService: createAuthService({ tokens, hashRounds }),
    requireAuth: createRequireAuth(tokens),
  };
};
