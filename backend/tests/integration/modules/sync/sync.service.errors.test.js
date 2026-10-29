import { describe, expect, it, vi } from 'vitest';
import { User } from '../../../../src/modules/users/user.model.js';
import { Submission } from '../../../../src/modules/sync/submission.model.js';
import { useTestDB } from '../../../helpers/db.js';
import { makeUser, objectId } from '../../../helpers/factories.js';
import { cfDown, cfHistory, cfUser, fakeCfClient } from '../../../helpers/codeforces.js';
import { createLinkedUser, createTestSyncService, reloadUser } from '../../../helpers/sync.js';

useTestDB();

const users = { ada_l: cfUser('Ada_L') };
const client = () => fakeCfClient({ users, submissions: cfHistory(3) });

describe('syncUser — errors and the lock', () => {
  it('answers 409 SYNC_IN_PROGRESS while the lock is held and leaves it alone', async () => {
    const lockedUntil = new Date(Date.now() + 60_000);
    const user = await createLinkedUser({ syncLockedUntil: lockedUntil });
    await expect(createTestSyncService(client()).syncUser(user._id))
      .rejects.toMatchObject({ statusCode: 409, code: 'SYNC_IN_PROGRESS' });
    expect((await reloadUser(user._id)).syncLockedUntil).toEqual(lockedUntil);
  });

  it('takes over an expired lock', async () => {
    const user = await createLinkedUser({ syncLockedUntil: new Date(Date.now() - 1_000) });
    expect((await createTestSyncService(client()).syncUser(user._id)).newSubmissions).toBe(3);
  });

  it('sets the lock to now + 5 min during the sync', async () => {
    const now = new Date('2026-10-29T10:00:00Z');
    const user = await createLinkedUser();
    const onSynced = vi.fn(async () => {
      expect((await reloadUser(user._id)).syncLockedUntil).toEqual(new Date('2026-10-29T10:05:00Z'));
    });
    await createTestSyncService(client(), { now: () => now, onSynced }).syncUser(user._id);
    expect(onSynced).toHaveBeenCalled();
  });

  it('answers 400 CF_HANDLE_NOT_LINKED without a handle and releases the lock', async () => {
    const user = await User.create(makeUser());
    await expect(createTestSyncService(client()).syncUser(user._id))
      .rejects.toMatchObject({ statusCode: 400, code: 'CF_HANDLE_NOT_LINKED' });
    expect((await reloadUser(user._id)).syncLockedUntil).toBeNull();
  });

  it('answers 503 CF_UNAVAILABLE when Codeforces is down and releases the lock', async () => {
    const failing = { ...client(), userStatus: vi.fn(async () => { throw cfDown(); }) };
    const user = await createLinkedUser();
    await expect(createTestSyncService(failing).syncUser(user._id))
      .rejects.toMatchObject({ statusCode: 503, code: 'CF_UNAVAILABLE' });
    expect(await reloadUser(user._id)).toMatchObject({ syncLockedUntil: null, lastSyncedAt: null });
  });

  it('maps an unexpected client failure to 503 and keeps the cursor for a retry', async () => {
    const failing = { ...client(), userInfo: vi.fn(async () => { throw new Error('socket hang up'); }) };
    const user = await createLinkedUser();
    await expect(createTestSyncService(failing).syncUser(user._id))
      .rejects.toMatchObject({ statusCode: 503, code: 'CF_UNAVAILABLE' });
    expect(await reloadUser(user._id)).toMatchObject({ syncLockedUntil: null, lastSubmissionId: null });
    expect(await Submission.countDocuments()).toBe(3);
  });

  it('releases the lock when the onSynced hook fails', async () => {
    const user = await createLinkedUser();
    const onSynced = async () => { throw new Error('stats failed'); };
    await expect(createTestSyncService(client(), { onSynced }).syncUser(user._id)).rejects.toThrow('stats failed');
    expect((await reloadUser(user._id)).syncLockedUntil).toBeNull();
  });

  it('answers 401 AUTH_INVALID_TOKEN for a deleted account', async () => {
    await expect(createTestSyncService(client()).syncUser(objectId()))
      .rejects.toMatchObject({ statusCode: 401, code: 'AUTH_INVALID_TOKEN' });
  });
});
