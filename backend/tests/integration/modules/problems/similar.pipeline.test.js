import { beforeEach, describe, expect, it } from 'vitest';
import { useTestDB } from '../../../helpers/db.js';
import { ids, insertCfApiStub, problemAt, seedProblems } from '../../../helpers/problems.js';
import { findSimilar } from '../../../../src/modules/problems/problems.service.js';
import { jaccard, ratingCloseness, similarityScore } from '../../../../src/modules/problems/helpers/similarity.js';

useTestDB();

const target = { tags: ['dp', 'greedy'], rating: 1500 };

const seed = async () => {
  await seedProblems([
    problemAt('10/A', { tags: ['dp', 'greedy'], rating: 1500 }),
    problemAt('11/A', { tags: ['dp', 'greedy'], rating: 1650 }),
    problemAt('12/A', { tags: ['dp'], rating: 1500 }),
    problemAt('13/A', { tags: ['dp', 'greedy', '*special'], rating: 1500 }),
    problemAt('14/A', { tags: ['math'], rating: 1500 }),
    problemAt('15/A', { tags: ['dp'], rating: 2000 }),
  ]);
  await insertCfApiStub('2000/C', { tags: ['greedy'], rating: 1400 });
};

describe('findSimilar pipeline (primary)', () => {
  beforeEach(seed);

  it('ranks by score desc then _id, inside the tag and rating filters', async () => {
    const { items, meta } = await findSimilar(target);
    expect(ids(items)).toEqual(['10/A', '13/A', '11/A', '12/A', '2000/C']);
    expect(meta).toEqual({ strategy: 'primary', ratingWindow: 300, targetRating: 1500, count: 5 });
  });

  it('computes the same scores as the JS helpers', async () => {
    const { items } = await findSimilar(target);
    items.forEach((item) => {
      const j = jaccard(target.tags, item.tags);
      const c = ratingCloseness(target.rating, item.rating, 300);
      expect(item.similarity.jaccard).toBeCloseTo(j, 10);
      expect(item.similarity.ratingCloseness).toBeCloseTo(c, 10);
      expect(item.similarity.score).toBeCloseTo(similarityScore(j, c), 10);
    });
  });

  it('includes cf_api rows without a statement and never returns statement text', async () => {
    const { items } = await findSimilar(target);
    const stub = items.find((item) => item.id === '2000/C');
    expect(stub).toMatchObject({ source: 'cf_api', hasEditorial: false, title: 'Stub 2000/C' });
    items.forEach((item) => {
      expect(item).not.toHaveProperty('description');
      expect(item).not.toHaveProperty('editorial');
    });
  });

  it('excludes ids and exact titles', async () => {
    const { items } = await findSimilar({ ...target, excludeIds: ['10/A'], excludeTitles: ['Title 13/A'] });
    expect(ids(items)).toEqual(['11/A', '12/A', '2000/C']);
  });

  it('limits results to k', async () => {
    const { items } = await findSimilar({ ...target, k: 2 });
    expect(ids(items)).toEqual(['10/A', '13/A']);
  });

  it('ignores *special and unknown tags in the input', async () => {
    const { items } = await findSimilar({ ...target, tags: ['dp', 'greedy', '*special', 'nope'] });
    expect(items[0].similarity.jaccard).toBe(1);
  });
});

describe('findSimilar k cap', () => {
  it('never returns more than 30 results', async () => {
    await seedProblems(Array.from({ length: 35 }, (_, i) => problemAt(`${100 + i}/A`, { tags: ['dp'] })));
    const { items } = await findSimilar({ tags: ['dp'], rating: 1200, k: 100 });
    expect(items).toHaveLength(30);
  });
});

describe('findSimilar without a rating', () => {
  it('uses tags only, ranked by jaccard', async () => {
    await seed();
    const { items, meta } = await findSimilar({ tags: ['dp', 'greedy'] });
    expect(meta).toMatchObject({ strategy: 'primary', targetRating: null });
    expect(ids(items)).toEqual(['10/A', '11/A', '13/A', '12/A', '15/A', '2000/C']);
  });
});
