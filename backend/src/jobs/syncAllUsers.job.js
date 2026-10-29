import mongoose from 'mongoose';
import { User as UserModel } from '../modules/users/user.model.js';
import { createJobErrorHandler } from './jobErrorHandler.js';

export const SYNC_ALL_USERS_JOB = 'syncAllUsers';

/**
 * Syncs every user with a linked handle, one at a time (the CF client spaces calls anyway).
 * The per-user sync cooldown does not apply here. A failing user goes to `onError` and the loop continues. `run()` never rejects, and a second
 * `run()` while one is in progress is skipped (cron and the HTTP trigger can overlap).
 */
export const createSyncAllUsersJob = ({
  syncService,
  User = UserModel,
  logger,
  onError = createJobErrorHandler(logger),
}) => {
  let running = false;

  const syncEach = async (summary) => {
    const users = await User.find({ cfHandle: mongoose.trusted({ $type: 'string' }) }, { _id: 1 }).lean();
    summary.users = users.length;
    for (const { _id } of users) {
      try {
        const { newSubmissions } = await syncService.syncUser(_id, { ignoreCooldown: true });
        summary.synced += 1;
        summary.newSubmissions += newSubmissions;
      } catch (err) {
        summary.failed += 1;
        onError(err, { job: SYNC_ALL_USERS_JOB, userId: String(_id) });
      }
    }
  };

  const run = async () => {
    if (running) {
      logger?.info({ job: SYNC_ALL_USERS_JOB }, 'Job already running, skipped');
      return { skipped: true };
    }
    running = true;
    const summary = { users: 0, synced: 0, failed: 0, newSubmissions: 0 };
    try {
      await syncEach(summary);
      logger?.info({ job: SYNC_ALL_USERS_JOB, ...summary }, 'Job finished');
    } catch (err) {
      onError(err, { job: SYNC_ALL_USERS_JOB });
    } finally {
      running = false;
    }
    return summary;
  };

  return { name: SYNC_ALL_USERS_JOB, run };
};
