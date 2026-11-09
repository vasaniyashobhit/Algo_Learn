import { describe, expect, it } from 'vitest';
import { User } from '../../../../src/modules/users/user.model.js';
import { acquireSyncLock, releaseSyncLock } from '../../../../src/modules/sync/sync.lock.js';
import { useTestDB } from '../../../helpers/db.js';
import { makeUser, objectId } from '../../../helpers/factories.js';

useTestDB();

const now = new Date('2026-10-29T12:00:00Z');
const lockMs = 5 * 60_000;

describe('sync lock', () => {
  it('locks a free user until now + lockMs and returns it', async () => {
    const { _id } = await User.create(makeUser());
    const user = await acquireSyncLock(User, _id, { now, lockMs });
    expect(user.syncLockedUntil).toEqual(new Date('2026-10-29T12:05:00Z'));
  });

  it('lets exactly one of two concurrent callers win', async () => {
    const { _id } = await User.create(makeUser());
    const results = await Promise.allSettled([
      acquireSyncLock(User, _id, { now, lockMs }),
      acquireSyncLock(User, _id, { now, lockMs }),
    ]);
    expect(results.map(({ status }) => status).sort()).toEqual(['fulfilled', 'rejected']);
    expect(results.find(({ status }) => status === 'rejected').reason.code).toBe('SYNC_IN_PROGRESS');
  });

  it('treats a lock ending exactly now as expired', async () => {
    const { _id } = await User.create(makeUser({ syncLockedUntil: now }));
    await expect(acquireSyncLock(User, _id, { now, lockMs })).resolves.toBeTruthy();
  });

  it('answers AUTH_INVALID_TOKEN for a missing user', async () => {
    await expect(acquireSyncLock(User, objectId(), { now, lockMs })).rejects.toMatchObject({ code: 'AUTH_INVALID_TOKEN' });
  });

  it('release clears the lock', async () => {
    const { _id } = await User.create(makeUser({ syncLockedUntil: new Date(Date.now() + 60_000) }));
    await releaseSyncLock(User, _id);
    expect((await User.findById(_id).lean()).syncLockedUntil).toBeNull();
  });
});
