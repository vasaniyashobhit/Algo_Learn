import mongoose from 'mongoose';
import { ConflictError } from '../../errors/httpErrors.js';
import { codes } from '../../errors/codes.js';
import { accountGone } from '../users/helpers/accountGone.js';

/** Matches users whose sync lock is unset or expired (null, missing, or not after `now`). */
export const unlockedFilter = (now) => ({ syncLockedUntil: mongoose.trusted({ $not: { $gt: now } }) });

/** Error for a conditional update on an unlocked user that matched nothing. */
export const lockedOrGone = async (User, userId) => {
  const exists = await User.exists({ _id: userId });
  return exists
    ? new ConflictError(codes.SYNC_IN_PROGRESS, 'A sync for this account is already running')
    : accountGone();
};

/** Atomically sets syncLockedUntil = now + lockMs if the lock is free; returns the user. */
export const acquireSyncLock = async (User, userId, { now, lockMs }) => {
  const user = await User.findOneAndUpdate(
    { _id: userId, ...unlockedFilter(now) },
    { $set: { syncLockedUntil: new Date(now.getTime() + lockMs) } },
    { new: true },
  ).lean();
  if (!user) throw await lockedOrGone(User, userId);
  return user;
};

export const releaseSyncLock = (User, userId) =>
  User.updateOne({ _id: userId }, { $set: { syncLockedUntil: null } });
