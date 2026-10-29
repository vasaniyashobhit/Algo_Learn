import { describe, expect, it } from 'vitest';
import { useTestDB } from '../../../helpers/db.js';
import { ids, problemAt, seedProblems } from '../../../helpers/problems.js';
import { findSimilar } from '../../../../src/modules/problems/problems.service.js';

useTestDB();

describe('findSimilar fill-up', () => {
  it('fills the free slots from later strategies, earlier results first', async () => {
    await seedProblems([
      problemAt('1/A', { tags: ['dp'], rating: 1500 }),
      problemAt('2/A', { tags: ['dp'], rating: 2000 }),
      problemAt('3/A', { tags: ['dp'], rating: 2600 }),
      problemAt('4/A', { tags: ['math'], rating: 1500 }),
    ]);
    const { items, meta } = await findSimilar({ tags: ['dp'], rating: 1500, k: 4 });
    expect(ids(items)).toEqual(['1/A', '2/A', '3/A', '4/A']);
    expect(meta).toEqual({
      strategy: 'primary',
      strategies: ['primary', 'widened_window', 'no_rating_filter', 'near_user_rating'],
      ratingWindow: 300,
      targetRating: 1500,
      count: 4,
    });
  });

  it('never repeats a problem and stops once k are found', async () => {
    await seedProblems([
      problemAt('1/A', { tags: ['dp'], rating: 1500 }),
      problemAt('2/A', { tags: ['dp'], rating: 1550 }),
      problemAt('3/A', { tags: ['dp'], rating: 1900 }),
      problemAt('4/A', { tags: ['dp'], rating: 2000 }),
    ]);
    const { items, meta } = await findSimilar({ tags: ['dp'], rating: 1500, k: 3 });
    expect(ids(items)).toEqual(['1/A', '2/A', '3/A']);
    expect(meta.strategies).toEqual(['primary', 'widened_window']);
  });

  it('keeps the caller exclusions in every strategy', async () => {
    await seedProblems([
      problemAt('1/A', { tags: ['dp'], rating: 1500 }),
      problemAt('2/A', { tags: ['math'], rating: 1500 }),
      problemAt('3/A', { tags: ['math'], rating: 1500, title: 'Same' }),
    ]);
    const { items } = await findSimilar({ tags: ['dp'], rating: 1500, excludeIds: ['2/A'], excludeTitles: ['Same'] });
    expect(ids(items)).toEqual(['1/A']);
  });

  it('reports the last strategy when nothing is found', async () => {
    const { items, meta } = await findSimilar({ tags: ['dp'], rating: 1500 });
    expect(items).toEqual([]);
    expect(meta).toMatchObject({ strategy: 'near_user_rating', strategies: [], count: 0 });
  });
});
