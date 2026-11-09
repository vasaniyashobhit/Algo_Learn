import { describe, expect, it } from 'vitest';
import { useTestDB } from '../../../helpers/db.js';
import { objectId } from '../../../helpers/factories.js';
import { createSyncedUser, createTestStatsService, insertSubmissions } from '../../../helpers/stats.js';

useTestDB();

const service = createTestStatsService();

describe('statsService.getSummary', () => {
  it('summarizes a synced user after a recompute', async () => {
    const user = await createSyncedUser();
    await insertSubmissions(user._id, [
      ['1/A', ['dp'], 1200, 'WRONG_ANSWER', 1],
      ['1/A', ['dp'], 1200, 'OK', 1],
      ['2/A', ['dp', 'math'], 1500, 'WRONG_ANSWER', 2],
      ['3/A', ['dp', 'math'], null, 'OK', 40],
      ['4/A', ['math'], 1250, 'OK', 0],
    ]);
    await service.recomputeForUser(user._id);
    const { data, meta } = await service.getSummary(String(user._id));
    expect(meta).toEqual({ cfHandle: 'Ada_L', cfRating: 1200, lastSyncedAt: expect.any(Date) });
    expect(data.totals).toEqual({
      submissions: 5, problemsAttempted: 4, problemsSolved: 3, topicsAttempted: 2, pairsTracked: 1,
    });
    expect(data.strongest.map(({ topicKey }) => topicKey)).toEqual(['math', 'dp']);
    expect(data.weakest.map(({ topicKey }) => topicKey)).toEqual(['dp', 'math']);
    expect(data.solvedByRating.bands.find(({ from }) => from === 1200).solved).toBe(2);
    expect(data.solvedByRating.unrated).toBe(1);
    expect(data.activity).toHaveLength(30);
    expect(data.activity.at(-1)).toEqual({ date: '2026-10-29', submissions: 1, accepted: 1 });
    expect(data.activity.at(-2)).toEqual({ date: '2026-10-28', submissions: 2, accepted: 1 });
  });

  it('returns the zero-filled shape with reason NO_HANDLE when no handle is linked', async () => {
    const user = await createSyncedUser({ cfHandle: undefined, cfRating: null, lastSyncedAt: null });
    const { data, meta } = await service.getSummary(String(user._id));
    expect(meta).toEqual({ cfHandle: null, cfRating: null, lastSyncedAt: null, reason: 'NO_HANDLE' });
    expect(data.totals.submissions).toBe(0);
    expect(data).toMatchObject({ strongest: [], weakest: [] });
    expect(data.solvedByRating.bands).toHaveLength(14);
    expect(data.activity.every(({ submissions }) => submissions === 0)).toBe(true);
  });

  it('throws AUTH_INVALID_TOKEN for a deleted account', async () => {
    await expect(service.getSummary(String(objectId()))).rejects.toMatchObject({ code: 'AUTH_INVALID_TOKEN' });
  });
});
