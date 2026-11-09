import { describe, expect, it } from 'vitest';
import { useTestDB } from '../../../helpers/db.js';
import { objectId } from '../../../helpers/factories.js';
import { createSyncedUser, createTestStatsService, insertSubmissions, statsOf } from '../../../helpers/stats.js';
import { Submission } from '../../../../src/modules/sync/submission.model.js';
import { TopicStat } from '../../../../src/modules/stats/topicStat.model.js';

useTestDB();

const service = createTestStatsService();

describe('statsService.recomputeForUser', () => {
  it('writes single and pair stats computed from the submissions', async () => {
    const user = await createSyncedUser();
    await insertSubmissions(user._id, [
      ['1/A', ['dp', 'greedy'], 1200, 'WRONG_ANSWER'],
      ['1/A', ['dp', 'greedy'], 1200, 'OK'],
      ['2/B', ['dp', 'greedy', '*special'], 1500, 'WRONG_ANSWER'],
      ['3/C', ['math'], 1300, 'OK'],
    ]);
    const result = await service.recomputeForUser(String(user._id));
    expect(result).toEqual({ singles: 3, pairs: 1, removed: 0 });
    const stats = await statsOf(user._id);
    expect(Object.keys(stats)).toEqual(['dp', 'dp+greedy', 'greedy', 'math']);
    expect(stats.dp).toMatchObject({
      kind: 'single', attempted: 2, solved: 1, failed: 1, maxSolvedRating: 1200, avgSolvedRating: 1200,
      comfortRating: 1200, lastActivityAt: new Date('2026-10-29T12:00:00Z'),
    });
    expect(stats.dp.strength).toBeCloseTo(0.5242254, 6); // (1 + 1.5) / (1 + 0.7689414 + 3)
    expect(stats['dp+greedy']).toMatchObject({ kind: 'pair', attempted: 2 });
    // 1300 vs 1200: s = 0.5 + sigmoid(1/3) = 1.0825702 → (s + 1.5) / (s + 3)
    expect(stats.math.strength).toBeCloseTo(0.6325844, 6);
  });

  it('replaces previous values and deletes stale keys of this user only', async () => {
    const user = await createSyncedUser();
    const other = objectId();
    await TopicStat.create([
      { userId: user._id, topicKey: 'graphs', kind: 'single', attempted: 9 },
      { userId: user._id, topicKey: 'dp', kind: 'single', attempted: 99, strength: 1 },
      { userId: other, topicKey: 'graphs', kind: 'single', attempted: 1 },
    ]);
    await insertSubmissions(user._id, [['1/A', ['dp'], 1200, 'OK']]);
    expect(await service.recomputeForUser(user._id)).toEqual({ singles: 1, pairs: 0, removed: 1 });
    const stats = await statsOf(user._id);
    expect(Object.keys(stats)).toEqual(['dp']);
    expect(stats.dp).toMatchObject({ attempted: 1, strength: 0.625 });
    expect(await TopicStat.countDocuments({ userId: other })).toBe(1);
  });

  it('is idempotent and clears everything when no submissions are left', async () => {
    const user = await createSyncedUser();
    await insertSubmissions(user._id, [['1/A', ['dp', 'math'], 1400, 'OK'], ['2/A', ['dp', 'math'], 1400, 'OK']]);
    await service.recomputeForUser(user._id);
    await service.recomputeForUser(user._id);
    expect(await TopicStat.countDocuments({ userId: user._id })).toBe(3);
    await Submission.deleteMany({ userId: user._id });
    expect(await service.recomputeForUser(user._id)).toEqual({ singles: 0, pairs: 0, removed: 3 });
  });

  it('uses the neutral weight when the user has no rating', async () => {
    const user = await createSyncedUser({ cfRating: null });
    await insertSubmissions(user._id, [['1/A', ['dp'], 3000, 'OK']]);
    await service.recomputeForUser(user._id);
    expect((await statsOf(user._id)).dp).toMatchObject({ strength: 0.625, comfortRating: 3000 });
  });

  it('throws AUTH_INVALID_TOKEN for a deleted account', async () => {
    await expect(service.recomputeForUser(String(objectId()))).rejects.toMatchObject({ code: 'AUTH_INVALID_TOKEN' });
  });
});
