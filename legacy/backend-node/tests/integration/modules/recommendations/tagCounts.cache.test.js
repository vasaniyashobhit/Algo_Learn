import { describe, expect, it, vi } from 'vitest';
import { useTestDB } from '../../../helpers/db.js';
import { problemAt, seedProblems } from '../../../helpers/problems.js';
import { Problem } from '../../../../src/modules/problems/problem.model.js';
import { createTagCountsCache } from '../../../../src/modules/recommendations/tagCounts.cache.js';

useTestDB();

describe('createTagCountsCache', () => {
  it('counts rated problems per rating and topic tag', async () => {
    await seedProblems([
      problemAt('1/A', { tags: ['dp', '*special'], rating: 1200 }),
      problemAt('2/A', { tags: ['dp', 'math'], rating: 1200 }),
      problemAt('3/A', { tags: [], rating: 1500 }),
      problemAt('4/A', { tags: ['dp'], rating: null }),
    ]);
    expect(await createTagCountsCache().get()).toEqual([
      { rating: 1200, total: 2, tags: { dp: 2, math: 1 } },
      { rating: 1500, total: 1, tags: {} },
    ]);
  });

  it('runs the aggregation once per hour, shared by concurrent callers', async () => {
    let clock = 0;
    const spy = vi.spyOn(Problem, 'aggregate');
    const cache = createTagCountsCache({ now: () => clock });
    await Promise.all([cache.get(), cache.get()]);
    clock = 3_599_999;
    await cache.get();
    expect(spy).toHaveBeenCalledTimes(1);
    clock = 3_600_000;
    await cache.get();
    expect(spy).toHaveBeenCalledTimes(2);
    cache.clear();
    await cache.get();
    expect(spy).toHaveBeenCalledTimes(3);
  });

  it('does not cache a failed aggregation', async () => {
    const failing = { aggregate: vi.fn().mockRejectedValueOnce(new Error('db down')).mockResolvedValue([]) };
    const cache = createTagCountsCache({ Problem: failing });
    await expect(cache.get()).rejects.toThrow('db down');
    expect(await cache.get()).toEqual([]);
    expect(failing.aggregate).toHaveBeenCalledTimes(2);
  });
});
