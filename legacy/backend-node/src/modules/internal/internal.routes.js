import { Router } from 'express';
import { createRequireCronSecret } from '../../middlewares/cronSecret.js';
import { createInternalController } from './internal.controller.js';

/** Hosted-cron triggers (for free hosts where in-process cron sleeps). Secret header required. */
export const createInternalRouter = ({ cronSecret, jobs }) => {
  const { syncAll } = createInternalController({ syncAllUsersJob: jobs.syncAllUsers });
  const router = Router();
  router.use(createRequireCronSecret(cronSecret));
  router.post('/sync-all', syncAll);
  return router;
};
