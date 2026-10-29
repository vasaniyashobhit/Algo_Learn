import nodeCron from 'node-cron';
import { PROBLEMSET_SYNC_CRON } from '../config/constants.js';

const DISABLED = Object.freeze({ tasks: [], stop: async () => {} });

/**
 * Schedules the in-process cron jobs: user sync on SYNC_CRON, problemset sync weekly.
 * Disabled when NODE_ENV=test. Returns `{ tasks, stop }`; `stop()` is called on shutdown.
 */
export const startScheduler = ({ env, jobs, cron = nodeCron, logger }) => {
  if (env.NODE_ENV === 'test') return DISABLED;
  const plan = [
    [env.SYNC_CRON, jobs.syncAllUsers],
    [PROBLEMSET_SYNC_CRON, jobs.syncProblemset],
  ];
  const tasks = plan.map(([expression, job]) =>
    cron.schedule(expression, () => job.run(), { name: job.name, noOverlap: true }));
  logger?.info({ jobs: plan.map(([expression, job]) => ({ job: job.name, cron: expression })) },
    'Scheduler started');
  return {
    tasks,
    stop: async () => {
      await Promise.all(tasks.map((task) => task.stop()));
    },
  };
};
