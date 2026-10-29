import { createCodeforcesClient } from './modules/codeforces/codeforces.client.js';
import { createHandleService } from './modules/users/handle.service.js';
import { createSyncService } from './modules/sync/sync.service.js';
import { createSyncAllUsersJob } from './jobs/syncAllUsers.job.js';
import { createSyncProblemsetJob } from './jobs/syncProblemset.job.js';

/**
 * Builds the services that share one Codeforces client (one rate limiter per process),
 * plus the background jobs. Used by createApp (routes) and server.js (scheduler).
 */
export const createServices = ({
  logger,
  client = createCodeforcesClient({ logger }),
  onSynced,
} = {}) => {
  const syncService = createSyncService({ client, onSynced });
  return {
    client,
    handleService: createHandleService({ client }),
    syncService,
    jobs: {
      syncAllUsers: createSyncAllUsersJob({ syncService, logger }),
      syncProblemset: createSyncProblemsetJob({ client, logger }),
    },
  };
};
