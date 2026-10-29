import { Router } from 'express';
import { healthRouter } from './modules/health/health.routes.js';
import { metaRouter } from './modules/meta/meta.routes.js';
import { createAuthRouter } from './modules/auth/auth.routes.js';
import { createUsersRouter } from './modules/users/users.routes.js';

export const API_BASE_PATH = '/api/v1';

/** Mounts every feature router under /api/v1. `auth` comes from createAuth(). */
export const createApiRouter = ({ auth, authRateLimit }) => {
  const { authService, requireAuth } = auth;
  const router = Router();
  router.use('/health', healthRouter);
  router.use('/meta', metaRouter);
  router.use('/auth', createAuthRouter({ authService, requireAuth, rateLimit: authRateLimit }));
  router.use('/users', createUsersRouter({ requireAuth }));
  return router;
};
