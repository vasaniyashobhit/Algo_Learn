import { describe, expect, it } from 'vitest';
import { useTestDB } from '../../../helpers/db.js';
import { cfHistory, cfUser, fakeCfClient } from '../../../helpers/codeforces.js';
import { TEST_SYNC, createLinkedUser, createTestSyncService, reloadUser } from '../../../helpers/sync.js';

useTestDB();

const users = { ada_l: cfUser('Ada_L') };
const NOW = new Date('2026-10-30T10:00:00Z');
const secondsAgo = (s) => new Date(NOW.getTime() - s * 1000);
const service = (client) =>
  createTestSyncService(client, { now: () => NOW, settings: { ...TEST_SYNC, cooldownMs: 20_000 } });

describe('syncUser — cooldown', () => {
  it('refuses within 20 s of lastSyncedAt with RATE_LIMITED and releases the lock', async () => {
    const client = fakeCfClient({ users, submissions: cfHistory(2) });
    const user = await createLinkedUser({ lastSyncedAt: secondsAgo(5.5) });
    await expect(service(client).syncUser(user._id)).rejects.toMatchObject({
      statusCode: 429, code: 'RATE_LIMITED', details: { retryAfterSeconds: 15 },
    });
    expect(client.userStatus).not.toHaveBeenCalled();
    expect((await reloadUser(user._id)).syncLockedUntil).toBeNull();
  });

  it('syncs again once 20 s have passed', async () => {
    const user = await createLinkedUser({ lastSyncedAt: secondsAgo(20) });
    const result = await service(fakeCfClient({ users, submissions: cfHistory(2) })).syncUser(user._id);
    expect(result.newSubmissions).toBe(2);
  });

  it('ignores the cooldown when asked (cron job)', async () => {
    const user = await createLinkedUser({ lastSyncedAt: secondsAgo(1) });
    const result = await service(fakeCfClient({ users, submissions: cfHistory(1) }))
      .syncUser(user._id, { ignoreCooldown: true });
    expect(result.newSubmissions).toBe(1);
  });

  it('reports SYNC_IN_PROGRESS before the cooldown while the lock is held', async () => {
    const user = await createLinkedUser({ lastSyncedAt: secondsAgo(1), syncLockedUntil: new Date(NOW.getTime() + 60_000) });
    await expect(service(fakeCfClient({ users })).syncUser(user._id)).rejects.toMatchObject({ code: 'SYNC_IN_PROGRESS' });
  });
});
