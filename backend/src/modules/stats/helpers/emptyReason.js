import { STATS_EMPTY_REASONS } from '../../../config/constants.js';

/** Why a user's stats are empty on purpose: no handle, or linked but never synced. */
export const emptyReason = (user) => {
  if (!user.cfHandle) return STATS_EMPTY_REASONS.noHandle;
  if (!user.lastSyncedAt) return STATS_EMPTY_REASONS.notSynced;
  return undefined;
};

/** `meta` with `reason` added only when there is one. */
export const withReason = (meta, user) => {
  const reason = emptyReason(user);
  return reason ? { ...meta, reason } : meta;
};
