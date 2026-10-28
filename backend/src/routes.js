import { Router } from 'express';
import { healthRouter } from './modules/health/health.routes.js';
import { metaRouter } from './modules/meta/meta.routes.js';

export const API_BASE_PATH = '/api/v1';

/** Mounts every feature router under /api/v1. */
export const createApiRouter = () => {
  const router = Router();
  router.use('/health', healthRouter);
  router.use('/meta', metaRouter);
  return router;
};
