import { syncNewProblems } from '../scripts/import/syncNewProblems.js';
import { createJobErrorHandler } from './jobErrorHandler.js';

export const SYNC_PROBLEMSET_JOB = 'syncProblemset';

/**
 * Weekly problemset refresh: inserts new CF problems and updates rating/tags of cf_api rows.
 * `run()` never rejects; failures go to `onError` and it resolves to null.
 */
export const createSyncProblemsetJob = ({
  client,
  logger,
  onError = createJobErrorHandler(logger),
  sync = syncNewProblems,
}) => {
  const run = async () => {
    try {
      const summary = await sync({ client });
      logger?.info({ job: SYNC_PROBLEMSET_JOB, ...summary }, 'Job finished');
      return summary;
    } catch (err) {
      onError(err, { job: SYNC_PROBLEMSET_JOB });
      return null;
    }
  };
  return { name: SYNC_PROBLEMSET_JOB, run };
};
