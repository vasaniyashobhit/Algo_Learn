import mongoose from 'mongoose';
import { User as UserModel } from './user.model.js';
import { Submission as SubmissionModel } from '../sync/submission.model.js';
import { TopicStat as TopicStatModel } from '../stats/topicStat.model.js';
import { toPublicUser } from './helpers/publicUser.js';
import { accountGone } from './helpers/accountGone.js';
import { ConflictError, NotFoundError } from '../../errors/httpErrors.js';
import { codes } from '../../errors/codes.js';
import { callCf } from '../codeforces/helpers/callCf.js';
import { lockedOrGone, unlockedFilter } from '../sync/sync.lock.js';

const DUPLICATE_KEY = 11000;
/** Same collation as the cfHandle index: handles compare case-insensitively. */
export const HANDLE_COLLATION = Object.freeze({ locale: 'en', strength: 2 });
const SYNC_RESET = { lastSyncedAt: null, lastSubmissionId: null };

const handleTaken = (cause) => new ConflictError(codes.CF_HANDLE_TAKEN,
  'This Codeforces handle is already linked to another account', null, { cause });

const sameHandle = (a, b) => typeof a === 'string' && a.toLowerCase() === b.toLowerCase();

/**
 * Link / unlink a Codeforces handle. Both refuse while a sync is running (SYNC_IN_PROGRESS).
 * Linking a different handle (or unlinking) deletes the user's submissions and topic stats.
 */
export const createHandleService = ({
  client,
  User = UserModel,
  Submission = SubmissionModel,
  TopicStat = TopicStatModel,
  now = () => new Date(),
}) => {
  const deleteSyncedData = (userId) =>
    Promise.all([Submission.deleteMany({ userId }), TopicStat.deleteMany({ userId })]);

  const updateUnlocked = async (userId, update, options = {}) => {
    const user = await User.findOneAndUpdate({ _id: userId, ...unlockedFilter(now()) }, update,
      { new: true, ...options }).lean();
    if (!user) throw await lockedOrGone(User, userId);
    return user;
  };

  const assertNotTaken = async (userId, handle) => {
    const owner = await User.exists({ cfHandle: handle, _id: mongoose.trusted({ $ne: userId }) })
      .collation(HANDLE_COLLATION);
    if (owner) throw handleTaken();
  };

  const saveHandle = async (userId, update) => {
    try {
      return await updateUnlocked(userId, update, { runValidators: true });
    } catch (err) {
      if (err?.code === DUPLICATE_KEY) throw handleTaken(err);
      throw err;
    }
  };

  const linkHandle = async (userId, handle) => {
    const current = await User.findById(userId).lean();
    if (!current) throw accountGone();
    await assertNotTaken(userId, handle);
    const [info] = (await callCf(() => client.userInfo(handle))) ?? [];
    if (!info?.handle) throw new NotFoundError(codes.CF_HANDLE_NOT_FOUND, 'Codeforces handle not found');
    const changed = !sameHandle(current.cfHandle, info.handle);
    const fields = { cfHandle: info.handle, cfRating: info.rating ?? null, cfMaxRating: info.maxRating ?? null };
    const user = await saveHandle(userId, { $set: { ...fields, ...(changed && SYNC_RESET) } });
    if (changed) await deleteSyncedData(user._id);
    return toPublicUser(user);
  };

  const unlinkHandle = async (userId) => {
    const user = await updateUnlocked(userId, {
      $unset: { cfHandle: 1 },
      $set: { cfRating: null, cfMaxRating: null, ...SYNC_RESET },
    });
    await deleteSyncedData(user._id);
    return toPublicUser(user);
  };

  return { linkHandle, unlinkHandle };
};
