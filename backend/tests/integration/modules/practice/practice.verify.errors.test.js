import { describe, expect, it, vi } from 'vitest';
import { useTestDB } from '../../../helpers/db.js';
import { problemAt, seedProblems } from '../../../helpers/problems.js';
import { cfUser, fakeCfClient } from '../../../helpers/codeforces.js';
import { insertSubmissions } from '../../../helpers/stats.js';
import { TEST_SYNC, createLinkedUser, createTestSyncService } from '../../../helpers/sync.js';
import { makeUser } from '../../../helpers/factories.js';
import { createVerifyService } from '../../../../src/modules/practice/practice.verify.js';
import { User } from '../../../../src/modules/users/user.model.js';

useTestDB();

const NOW = new Date('2026-10-30T10:00:00Z');
const cooling = (client) => createVerifyService({
  syncService: createTestSyncService(client, { now: () => NOW, settings: { ...TEST_SYNC, cooldownMs: 20_000 } }),
});
const recentlySynced = () => createLinkedUser({ lastSyncedAt: new Date(NOW.getTime() - 5_000) });

describe('verify — sync cooldown, lock and errors', () => {
  it('inside the cooldown, verifies from stored submissions without calling Codeforces', async () => {
    await seedProblems([problemAt('50/B')]);
    const user = await recentlySynced();
    await insertSubmissions(user._id, [['50/B', ['dp'], 1500, 'OK']]);
    const client = fakeCfClient({ users: { ada_l: cfUser('Ada_L') } });
    const result = await cooling(client).verify(user._id, '50/B');
    expect(result).toMatchObject({ verified: true, item: { status: 'solved' } });
    expect(client.userStatus).not.toHaveBeenCalled();
  });

  it('inside the cooldown and not solved in the stored data, passes RATE_LIMITED on', async () => {
    await seedProblems([problemAt('50/B')]);
    const user = await recentlySynced();
    await expect(cooling(fakeCfClient()).verify(user._id, '50/B')).rejects.toMatchObject({
      statusCode: 429, code: 'RATE_LIMITED', details: { retryAfterSeconds: 15 },
    });
  });

  it('respects the sync lock: 409 SYNC_IN_PROGRESS', async () => {
    await seedProblems([problemAt('50/B')]);
    const user = await createLinkedUser({ syncLockedUntil: new Date(NOW.getTime() + 60_000) });
    await expect(cooling(fakeCfClient()).verify(user._id, '50/B')).rejects.toMatchObject({ code: 'SYNC_IN_PROGRESS' });
  });

  it('answers 400 CF_HANDLE_NOT_LINKED without a handle', async () => {
    await seedProblems([problemAt('50/B')]);
    const user = await User.create(makeUser());
    await expect(cooling(fakeCfClient()).verify(user._id, '50/B')).rejects.toMatchObject({ code: 'CF_HANDLE_NOT_LINKED' });
  });

  it('answers 404 PROBLEM_NOT_FOUND before syncing', async () => {
    const syncUser = vi.fn();
    const user = await createLinkedUser();
    await expect(createVerifyService({ syncService: { syncUser } }).verify(user._id, '99/Z'))
      .rejects.toMatchObject({ statusCode: 404, code: 'PROBLEM_NOT_FOUND' });
    expect(syncUser).not.toHaveBeenCalled();
  });

  it('passes other sync failures on unchanged', async () => {
    await seedProblems([problemAt('50/B')]);
    const err = Object.assign(new Error('down'), { code: 'CF_UNAVAILABLE' });
    const syncService = { syncUser: vi.fn(async () => { throw err; }) };
    const user = await createLinkedUser();
    await expect(createVerifyService({ syncService }).verify(user._id, '50/B')).rejects.toBe(err);
  });
});
