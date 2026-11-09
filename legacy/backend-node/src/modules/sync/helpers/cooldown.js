/** Milliseconds left before `lastSyncedAt + cooldownMs`; 0 when never synced or the cooldown is over. */
export const cooldownLeftMs = (lastSyncedAt, now, cooldownMs = 0) => {
  if (!lastSyncedAt || !(cooldownMs > 0)) return 0;
  const left = new Date(lastSyncedAt).getTime() + cooldownMs - now.getTime();
  return Math.max(0, left);
};
