import { describe, expect, it } from 'vitest';
import { useTestDB } from '../../../helpers/db.js';
import { objectId } from '../../../helpers/factories.js';
import { createSyncedUser, createTestStatsService } from '../../../helpers/stats.js';
import { TopicStat } from '../../../../src/modules/stats/topicStat.model.js';

useTestDB();

const service = createTestStatsService();
const stat = (userId, topicKey, strength, attempted, kind = 'single') =>
  ({ userId, topicKey, kind, strength, attempted, solved: 0, failed: attempted });
const keys = ({ items }) => items.map(({ topicKey }) => topicKey);

const seed = async () => {
  const user = await createSyncedUser();
  await TopicStat.create([
    stat(user._id, 'dp', 0.7, 3), stat(user._id, 'math', 0.4, 9), stat(user._id, 'greedy', 0.7, 5),
    stat(user._id, 'dp+math', 0.6, 2, 'pair'), stat(objectId(), 'graphs', 0.9, 1),
  ]);
  return String(user._id);
};

describe('statsService.getStats', () => {
  it('lists single topics by strength (ties: more attempts first) with meta', async () => {
    const userId = await seed();
    const result = await service.getStats(userId);
    expect(keys(result)).toEqual(['greedy', 'dp', 'math']);
    expect(result.items[0]).toEqual(expect.objectContaining({ topicKey: 'greedy', tags: ['greedy'], strength: 0.7 }));
    expect(result.items[0]).not.toHaveProperty('userId');
    expect(result.meta).toEqual({ kind: 'single', sort: 'strength', limit: 50, total: 3, lastSyncedAt: expect.any(Date) });
  });

  it('sorts by attempted, limits, and filters pairs', async () => {
    const userId = await seed();
    const byAttempts = await service.getStats(userId, { kind: 'single', sort: 'attempted', limit: 2 });
    expect(keys(byAttempts)).toEqual(['math', 'greedy']);
    expect(byAttempts.meta.total).toBe(3);
    const pairs = await service.getStats(userId, { kind: 'pair', sort: 'strength', limit: 10 });
    expect(pairs.items).toEqual([expect.objectContaining({ topicKey: 'dp+math', tags: ['dp', 'math'] })]);
  });

  it('returns empty items with reason NO_HANDLE when no handle is linked', async () => {
    const user = await createSyncedUser({ cfHandle: undefined, lastSyncedAt: null });
    await TopicStat.create(stat(user._id, 'dp', 0.5, 1));
    const result = await service.getStats(String(user._id));
    expect(result).toEqual({
      items: [], meta: { kind: 'single', sort: 'strength', limit: 50, total: 0, lastSyncedAt: null, reason: 'NO_HANDLE' },
    });
  });

  it('adds reason NOT_SYNCED for a linked handle that was never synced', async () => {
    const user = await createSyncedUser({ lastSyncedAt: null });
    const result = await service.getStats(String(user._id));
    expect(result.items).toEqual([]);
    expect(result.meta).toMatchObject({ total: 0, reason: 'NOT_SYNCED' });
  });

  it('throws AUTH_INVALID_TOKEN for a deleted account', async () => {
    await expect(service.getStats(String(objectId()))).rejects.toMatchObject({ code: 'AUTH_INVALID_TOKEN' });
  });
});
