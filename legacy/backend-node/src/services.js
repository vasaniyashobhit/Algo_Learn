import { createCodeforcesClient } from './modules/codeforces/codeforces.client.js';
import { createHandleService } from './modules/users/handle.service.js';
import { createSyncService } from './modules/sync/sync.service.js';
import { createStatsService } from './modules/stats/stats.service.js';
import { createRecommendationsService } from './modules/recommendations/recommendations.service.js';
import { createPracticeService } from './modules/practice/practice.service.js';
import { createVerifyService } from './modules/practice/practice.verify.js';
import { createOfflineLlm } from './modules/llm/llm.module.js';
import { createStuckFeature } from './modules/stuck/stuck.module.js';
import { createOcr } from './lib/ocr.js';
import { STUCK } from './config/constants.js';
import { createSyncAllUsersJob } from './jobs/syncAllUsers.job.js';
import { createSyncProblemsetJob } from './jobs/syncProblemset.job.js';

/**
 * Builds the services that share one Codeforces client (one rate limiter per process),
 * plus the background jobs. Used by createApp (routes) and server.js (scheduler).
 * After every successful sync the user's topic stats are recomputed (`onSynced`).
 * The recommendations service holds the 1-hour tag-frequency cache (one per process).
 * `llm` (createLlm in server.js, offline by default) feeds the stuck flow; `ocr`, `fetchImpl`,
 * `lookup` and `extractPdfText` are injectable for tests. `ocr` (one reused tesseract worker) is
 * returned so server.js can terminate it on shutdown.
 */
export const createServices = ({
  logger,
  client = createCodeforcesClient({ logger }),
  statsService = createStatsService(),
  onSynced = statsService.recomputeForUser,
  recommendationsService = createRecommendationsService(),
  llm = createOfflineLlm({ logger }),
  ocr = createOcr({ language: STUCK.ocrLanguage, logger }),
  stuck = {},
} = {}) => {
  const syncService = createSyncService({ client, onSynced });
  return {
    client,
    handleService: createHandleService({ client }),
    syncService,
    statsService,
    recommendationsService,
    practiceService: { ...createPracticeService(), ...createVerifyService({ syncService }) },
    ocr,
    stuckService: createStuckFeature({ llm, ocr, logger, ...stuck }),
    jobs: {
      syncAllUsers: createSyncAllUsersJob({ syncService, logger }),
      syncProblemset: createSyncProblemsetJob({ client, logger }),
    },
  };
};
