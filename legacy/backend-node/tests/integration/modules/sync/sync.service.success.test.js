import { describe, expect, it, vi } from 'vitest';
import { Submission } from '../../../../src/modules/sync/submission.model.js';
import { useTestDB } from '../../../helpers/db.js';
import { cfHistory, cfSubmission, cfUser, fakeCfClient } from '../../../helpers/codeforces.js';
import { createLinkedUser, createTestSyncService, reloadUser } from '../../../helpers/sync.js';

useTestDB();

const users = { ada_l: cfUser('Ada_L', { rating: 1720, maxRating: 1900 }) };

describe('syncUser — first sync', () => {
  it('pages through the history up to maxPages and stores storable submissions', async () => {
    const client = fakeCfClient({ users, submissions: cfHistory(20) });
    const user = await createLinkedUser();
    const result = await createTestSyncService(client).syncUser(user._id);
    expect(client.userStatus.mock.calls).toEqual([['Ada_L', 1, 5], ['Ada_L', 6, 5], ['Ada_L', 11, 5]]);
    expect(result).toEqual({ newSubmissions: 15, totalSubmissions: 15, lastSyncedAt: expect.any(Date), pending: [] });
    const stored = await Submission.findOne({ cfSubmissionId: 20 }).lean();
    expect(stored).toMatchObject({ problemTags: ['dp', 'math'], problemRating: 1500, verdict: 'OK' });
    expect(String(stored.userId)).toBe(String(user._id));
  });

  it('refreshes the rating, sets lastSyncedAt / lastSubmissionId and releases the lock', async () => {
    const now = new Date('2026-10-29T10:00:00Z');
    const client = fakeCfClient({ users, submissions: cfHistory(3) });
    const user = await createLinkedUser();
    await createTestSyncService(client, { now: () => now }).syncUser(user._id);
    expect(await reloadUser(user._id)).toMatchObject({
      cfRating: 1720, cfMaxRating: 1900, lastSyncedAt: now, lastSubmissionId: 3, syncLockedUntil: null,
    });
  });

  it('skips submissions without a contestId and pending ones', async () => {
    const submissions = [
      cfSubmission(4, { verdict: 'TESTING' }),
      cfSubmission(3, { problem: { index: 'A', name: 'acmsguru 1' } }),
      cfSubmission(2), cfSubmission(1),
    ];
    const user = await createLinkedUser();
    const result = await createTestSyncService(fakeCfClient({ users, submissions })).syncUser(user._id);
    expect(result.newSubmissions).toBe(2);
    expect(result.pending).toEqual([{ problemId: '1004/A', cfSubmissionId: 4 }]);
    expect((await reloadUser(user._id)).lastSubmissionId).toBe(3);
  });

  it('calls the onSynced hook with the user id after saving', async () => {
    const onSynced = vi.fn(async () => {
      expect(await Submission.countDocuments()).toBe(2);
    });
    const user = await createLinkedUser();
    await createTestSyncService(fakeCfClient({ users, submissions: cfHistory(2) }), { onSynced }).syncUser(user._id);
    expect(onSynced).toHaveBeenCalledExactlyOnceWith(String(user._id));
  });

  it('works with the default no-op hook and a handle with no rating', async () => {
    const client = fakeCfClient({ users: { ada_l: { handle: 'Ada_L' } }, submissions: [] });
    const user = await createLinkedUser();
    expect(await createTestSyncService(client).syncUser(user._id)).toMatchObject({ newSubmissions: 0 });
    expect(await reloadUser(user._id)).toMatchObject({ cfRating: null, lastSubmissionId: null });
  });
});
