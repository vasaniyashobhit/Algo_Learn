import { Router } from 'express';
import { STUCK } from '../../config/constants.js';
import { validate } from '../../middlewares/validate.js';
import { createUpload } from '../../middlewares/upload.js';
import { createRateLimiter, userKey } from '../../middlewares/rateLimit.js';
import { stuckBodySchema, stuckHistoryQuerySchema } from './stuck.schema.js';
import { createStuckController } from './stuck.controller.js';

/**
 * Every /stuck route is protected. POST is limited per user (before the upload is buffered),
 * then multer reads the optional `file`, then the body is validated.
 */
export const createStuckRouter = ({ requireAuth, stuckService, rateLimit = STUCK.rateLimit, upload = createUpload() }) => {
  const c = createStuckController({ stuckService });
  const router = Router();
  router.use(requireAuth);
  router.post('/', createRateLimiter({ ...rateLimit, keyGenerator: userKey }), upload,
    validate({ body: stuckBodySchema }), c.solveStuck);
  router.get('/history', validate({ query: stuckHistoryQuerySchema }), c.listStuckHistory);
  router.get('/:id', c.getStuck);
  router.get('/:id/solution', c.getStuckSolution);
  router.delete('/:id', c.removeStuck);
  return router;
};
