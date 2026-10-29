import { describe, expect, it } from 'vitest';
import { User } from '../../../../src/modules/users/user.model.js';
import { Submission } from '../../../../src/modules/sync/submission.model.js';
import { TopicStat } from '../../../../src/modules/stats/topicStat.model.js';
import { createHandleService } from '../../../../src/modules/users/handle.service.js';
import { useTestDB } from '../../../helpers/db.js';
import { makeSubmission, makeTopicStat, makeUser, objectId } from '../../../helpers/factories.js';
import { cfUser, fakeCfClient } from '../../../helpers/codeforces.js';

useTestDB();

const client = fakeCfClient({ users: { tourist: cfUser('tourist'), petr: cfUser('Petr', { rating: undefined }) } });
const service = createHandleService({ client });

const seedSyncedUser = async (overrides = {}) => {
  const user = await User.create(makeUser({ cfHandle: 'tourist', lastSubmissionId: 99, lastSyncedAt: new Date(), ...overrides }));
  await Submission.create(makeSubmission({ userId: user._id }));
  await TopicStat.create(makeTopicStat({ userId: user._id }));
  await Submission.create(makeSubmission());
  return user;
};

describe('handle.service', () => {
  it('keeps synced data when the same handle is linked again', async () => {
    const user = await seedSyncedUser();
    await service.linkHandle(user._id, 'TOURIST');
    expect(await Submission.countDocuments({ userId: user._id })).toBe(1);
    expect((await User.findById(user._id).lean()).lastSubmissionId).toBe(99);
  });

  it('resets the sync state and deletes old data when the handle changes', async () => {
    const user = await seedSyncedUser();
    const result = await service.linkHandle(user._id, 'petr');
    expect(result).toMatchObject({ cfHandle: 'Petr', cfRating: null, lastSyncedAt: null });
    expect(await Submission.countDocuments({ userId: user._id })).toBe(0);
    expect(await TopicStat.countDocuments({ userId: user._id })).toBe(0);
    expect(await Submission.countDocuments()).toBe(1);
    expect((await User.findById(user._id).lean()).lastSubmissionId).toBeNull();
  });

  it('unlinks: removes the handle, ratings, sync state, submissions and topic stats', async () => {
    const user = await seedSyncedUser({ cfRating: 3000 });
    const result = await service.unlinkHandle(user._id);
    expect(result).toMatchObject({ cfHandle: null, cfRating: null, cfMaxRating: null, lastSyncedAt: null });
    const stored = await User.findById(user._id).lean();
    expect(stored).not.toHaveProperty('cfHandle');
    expect(stored.lastSubmissionId).toBeNull();
    expect(await Submission.countDocuments({ userId: user._id })).toBe(0);
    expect(await TopicStat.countDocuments({ userId: user._id })).toBe(0);
    expect(await Submission.countDocuments()).toBe(1);
  });

  it('refuses to link or unlink while a sync is running', async () => {
    const user = await seedSyncedUser({ syncLockedUntil: new Date(Date.now() + 60_000) });
    await expect(service.linkHandle(user._id, 'petr')).rejects.toMatchObject({ code: 'SYNC_IN_PROGRESS' });
    await expect(service.unlinkHandle(user._id)).rejects.toMatchObject({ code: 'SYNC_IN_PROGRESS' });
    expect(await Submission.countDocuments({ userId: user._id })).toBe(1);
  });

  it('answers AUTH_INVALID_TOKEN for a deleted account', async () => {
    await expect(service.linkHandle(objectId(), 'tourist')).rejects.toMatchObject({ code: 'AUTH_INVALID_TOKEN' });
    await expect(service.unlinkHandle(objectId())).rejects.toMatchObject({ code: 'AUTH_INVALID_TOKEN' });
  });

  it('answers CF_HANDLE_NOT_FOUND when Codeforces returns no user', async () => {
    const user = await User.create(makeUser());
    const empty = createHandleService({ client: { userInfo: async () => [] } });
    await expect(empty.linkHandle(user._id, 'ghost')).rejects.toMatchObject({ statusCode: 404, code: 'CF_HANDLE_NOT_FOUND' });
  });

  it('maps a race on the unique index to CF_HANDLE_TAKEN', async () => {
    const user = await User.create(makeUser());
    const racing = createHandleService({
      client,
      User: Object.assign(Object.create(User), {
        findOneAndUpdate: () => ({ lean: async () => { throw Object.assign(new Error('E11000'), { code: 11000 }); } }),
      }),
    });
    await expect(racing.linkHandle(user._id, 'tourist')).rejects.toMatchObject({ statusCode: 409, code: 'CF_HANDLE_TAKEN' });
  });

  it('re-throws other database errors unchanged', async () => {
    const user = await User.create(makeUser());
    const boom = new Error('db down');
    const failing = createHandleService({
      client,
      User: Object.assign(Object.create(User), { findOneAndUpdate: () => ({ lean: async () => { throw boom; } }) }),
    });
    await expect(failing.linkHandle(user._id, 'tourist')).rejects.toBe(boom);
  });
});
