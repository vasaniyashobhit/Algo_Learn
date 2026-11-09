import { Router } from 'express';
import { validate } from '../../middlewares/validate.js';
import { createRateLimiter, AUTH_RATE_LIMIT } from '../../middlewares/rateLimit.js';
import { createAuthController } from './auth.controller.js';
import { loginSchema, signupSchema } from './auth.schema.js';

/**
 * /auth routes. Signup and login share one stricter per-IP limiter (brute force);
 * GET /me is only under the global API limit because the frontend calls it on every page load.
 */
export const createAuthRouter = ({ authService, requireAuth, rateLimit = AUTH_RATE_LIMIT }) => {
  const controller = createAuthController({ authService });
  const strictLimit = createRateLimiter(rateLimit);
  const router = Router();
  router.post('/signup', strictLimit, validate({ body: signupSchema }), controller.signup);
  router.post('/login', strictLimit, validate({ body: loginSchema }), controller.login);
  router.get('/me', requireAuth, controller.me);
  return router;
};
