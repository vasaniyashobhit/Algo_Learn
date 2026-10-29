import { User as UserModel } from '../users/user.model.js';
import { Submission as SubmissionModel } from './submission.model.js';
import { ValidationError } from '../../errors/httpErrors.js';
import { codes } from '../../errors/codes.js';
import { SYNC } from '../../config/constants.js';
import { callCf } from '../codeforces/helpers/callCf.js';
import { acquireSyncLock, releaseSyncLock } from './sync.lock.js';
import { fetchNewSubmissions } from './helpers/fetchNewSubmissions.js';
import { insertIgnoringDuplicates } from './helpers/insertSubmissions.js';
import { isStorable, nextCursor, toSubmissionDoc, uniqueById } from './helpers/cfSubmissions.js';

const notLinked = () =>
  new ValidationError(codes.CF_HANDLE_NOT_LINKED, 'Link a Codeforces handle before syncing');

/**
 * syncUser(userId): pulls new Codeforces submissions under a per-user lock (always released),
 * refreshes the rating, then calls `onSynced(userId)` (Session 7 plugs in the stats recompute).
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
    return { newSubmissions, cursor: nextCursor(fetched, user.lastSubmissionId ?? null) };
  };

  const runSync = async (user) => {
    const { newSubmissions, cursor } = await pullSubmissions(user);
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
    return { newSubmissions, totalSubmissions, lastSyncedAt };
  };

  const syncUser = async (userId) => {
    const user = await acquireSyncLock(User, userId, { now: now(), lockMs: settings.lockMs });
    try {
      if (!user.cfHandle) throw notLinked();
      return await runSync(user);
    } finally {
      await releaseSyncLock(User, userId);
    }
  };

  return { syncUser };
};
