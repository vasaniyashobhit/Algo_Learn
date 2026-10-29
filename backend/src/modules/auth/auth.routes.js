import { Router } from 'express';
import { validate } from '../../middlewares/validate.js';
import { createRateLimiter, AUTH_RATE_LIMIT } from '../../middlewares/rateLimit.js';
import { createAuthController } from './auth.controller.js';
import { loginSchema, signupSchema } from './auth.schema.js';

/** /auth routes, all behind a stricter per-IP rate limit than the rest of the API. */
export const createAuthRouter = ({ authService, requireAuth, rateLimit = AUTH_RATE_LIMIT }) => {
  const controller = createAuthController({ authService });
  const router = Router();
  router.use(createRateLimiter(rateLimit));
  router.post('/signup', validate({ body: signupSchema }), controller.signup);
  router.post('/login', validate({ body: loginSchema }), controller.login);
  router.get('/me', requireAuth, controller.me);
  return router;
};
