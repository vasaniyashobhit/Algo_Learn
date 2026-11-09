import { User as UserModel } from '../users/user.model.js';
import { Submission as SubmissionModel } from './submission.model.js';
import { RateLimitError, ValidationError } from '../../errors/httpErrors.js';
import { codes } from '../../errors/codes.js';
import { SYNC } from '../../config/constants.js';
import { callCf } from '../codeforces/helpers/callCf.js';
import { acquireSyncLock, releaseSyncLock } from './sync.lock.js';
import { fetchNewSubmissions } from './helpers/fetchNewSubmissions.js';
import { insertIgnoringDuplicates } from './helpers/insertSubmissions.js';
import { isStorable, nextCursor, pendingRefs, toSubmissionDoc, uniqueById } from './helpers/cfSubmissions.js';
import { cooldownLeftMs } from './helpers/cooldown.js';

const notLinked = () =>
  new ValidationError(codes.CF_HANDLE_NOT_LINKED, 'Link a Codeforces handle before syncing');

const coolingDown = (leftMs) => new RateLimitError(codes.RATE_LIMITED,
  'This account was synced a moment ago, try again shortly', { retryAfterSeconds: Math.ceil(leftMs / 1000) });

/**
 * syncUser(userId): pulls new Codeforces submissions under a per-user lock (always released),
 * refreshes the rating, then calls `onSynced(userId)` (Session 7 plugs in the stats recompute).
 * Refuses with RATE_LIMITED within `settings.cooldownMs` of lastSyncedAt unless `ignoreCooldown`
 * (the cron job). `pending` lists submissions still being judged (they are not stored).
 */
export const createSyncService = ({
  client,
  onSynced = async () => {},
  User = UserModel,
  Submission = SubmissionModel,
  now = () => new Date(),
  settings = SYNC,
}) => {
  const pullSubmissions = async (user) => {
    const { submissions } = await callCf(() => fetchNewSubmissions(client, user.cfHandle, {
      after: user.lastSubmissionId ?? null,
      pageSize: settings.pageSize,
      maxPages: settings.maxPages,
    }));
    const fetched = uniqueById(submissions);
    const docs = fetched.filter(isStorable).map(toSubmissionDoc(user._id));
    const newSubmissions = await insertIgnoringDuplicates(Submission, docs);
    return {
      newSubmissions,
      cursor: nextCursor(fetched, user.lastSubmissionId ?? null),
      pending: pendingRefs(fetched),
    };
  };

  const runSync = async (user) => {
    const { newSubmissions, cursor, pending } = await pullSubmissions(user);
    const [info] = await callCf(() => client.userInfo(user.cfHandle));
    const lastSyncedAt = now();
    await User.updateOne({ _id: user._id }, {
      $set: {
        cfRating: info?.rating ?? null,
        cfMaxRating: info?.maxRating ?? null,
        lastSyncedAt,
        lastSubmissionId: cursor,
      },
    });
    await onSynced(String(user._id));
    const totalSubmissions = await Submission.countDocuments({ userId: user._id });
    return { newSubmissions, totalSubmissions, lastSyncedAt, pending };
  };

  const syncUser = async (userId, { ignoreCooldown = false } = {}) => {
    const startedAt = now();
    const user = await acquireSyncLock(User, userId, { now: startedAt, lockMs: settings.lockMs });
    try {
      if (!user.cfHandle) throw notLinked();
      const leftMs = ignoreCooldown ? 0 : cooldownLeftMs(user.lastSyncedAt, startedAt, settings.cooldownMs);
      if (leftMs > 0) throw coolingDown(leftMs);
      return await runSync(user);
    } finally {
      await releaseSyncLock(User, userId);
    }
  };

  return { syncUser };
};
