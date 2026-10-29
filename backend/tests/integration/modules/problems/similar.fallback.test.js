import { describe, expect, it } from 'vitest';
import { useTestDB } from '../../../helpers/db.js';
import { ids, insertCfApiStub, problemAt, seedProblems } from '../../../helpers/problems.js';
import { findSimilar } from '../../../../src/modules/problems/problems.service.js';

useTestDB();

describe('findSimilar fallbacks', () => {
  it('(a) widens the rating window ×2 when the window is empty', async () => {
    await seedProblems([problemAt('1/A', { tags: ['dp'], rating: 1900 }), problemAt('2/A', { tags: ['dp'], rating: 2200 })]);
    const { items, meta } = await findSimilar({ tags: ['dp'], rating: 1500, ratingWindow: 300 });
    expect(meta).toMatchObject({ strategy: 'widened_window', ratingWindow: 600, count: 1 });
    expect(ids(items)).toEqual(['1/A']);
  });

  it('(b) drops the rating filter; rated problems come before unrated ones', async () => {
    await seedProblems([problemAt('1/A', { tags: ['dp'], rating: null }), problemAt('2/A', { tags: ['dp'], rating: 3000 })]);
    const { items, meta } = await findSimilar({ tags: ['dp'], rating: 1000 });
    expect(meta.strategy).toBe('no_rating_filter');
    expect(ids(items)).toEqual(['2/A', '1/A']);
  });

  it('(c) untagged input: ±200 band sorted by rating closeness', async () => {
    await seedProblems([
      problemAt('1/A', { tags: ['math'], rating: 1600 }),
      problemAt('2/A', { tags: [], rating: 1450 }),
      problemAt('3/A', { tags: ['dp'], rating: 1800 }),
    ]);
    const { items, meta } = await findSimilar({ tags: [], rating: 1500 });
    expect(meta).toMatchObject({ strategy: 'rating_band', ratingWindow: 200 });
    expect(ids(items)).toEqual(['2/A', '1/A']);
  });

  it('(c) treats input with only *special as untagged', async () => {
    await seedProblems([problemAt('1/A', { tags: ['*special'], rating: 1500 })]);
    const { meta } = await findSimilar({ tags: ['*special'], rating: 1500 });
    expect(meta.strategy).toBe('rating_band');
  });

  it('(d) no tag matches: nearest to the problem rating, unrated last', async () => {
    await seedProblems([problemAt('1/A', { tags: ['math'], rating: 1000 }), problemAt('2/A', { tags: ['math'], rating: 1600 })]);
    await insertCfApiStub('3/A', { tags: ['math'] });
    const { items, meta } = await findSimilar({ tags: ['flows'], rating: 1500 });
    expect(meta).toMatchObject({ strategy: 'near_user_rating', targetRating: 1500 });
    expect(ids(items)).toEqual(['2/A', '1/A', '3/A']);
  });

  it('(d) prefers the user rating when given', async () => {
    await seedProblems([problemAt('1/A', { tags: ['math'], rating: 1000 }), problemAt('2/A', { tags: ['math'], rating: 1600 })]);
    const { items, meta } = await findSimilar({ tags: ['flows'], rating: 1500, userRating: 1000 });
    expect(meta.targetRating).toBe(1000);
    expect(ids(items)).toEqual(['1/A', '2/A']);
  });

  it('(d) untagged and unrated input uses the default target (1200)', async () => {
    await seedProblems([problemAt('1/A', { rating: 2000 }), problemAt('2/A', { rating: 1300 })]);
    const { items, meta } = await findSimilar({});
    expect(meta).toMatchObject({ strategy: 'near_user_rating', targetRating: 1200 });
    expect(ids(items)).toEqual(['2/A', '1/A']);
  });

  it('only comes back empty when nothing is left to return', async () => {
    await seedProblems([problemAt('1/A')]);
    const { items, meta } = await findSimilar({ tags: ['dp'], rating: 1200, excludeIds: ['1/A'] });
    expect(items).toEqual([]);
    expect(meta).toMatchObject({ strategy: 'near_user_rating', count: 0 });
  });
});
