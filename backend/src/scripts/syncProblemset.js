import { createCodeforcesClient } from '../modules/codeforces/codeforces.client.js';
import { syncNewProblems } from './import/syncNewProblems.js';
import { isEntryPoint, runAsMain } from './runScript.js';

/** Adds Codeforces problems missing from the DB (tags + rating only, no statements). */
export const syncProblemsetTask = async ({ logger, client = createCodeforcesClient({ logger }) } = {}) => {
  logger?.info('Fetching problemset.problems from Codeforces');
  return syncNewProblems({ client });
};

/* c8 ignore next 3 -- only runs as `npm run sync:problemset` */
if (isEntryPoint(import.meta.url)) {
  await runAsMain('sync:problemset', syncProblemsetTask);
}
