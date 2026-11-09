import { beforeEach, describe, expect, it } from 'vitest';
import { useTestDB } from '../../../helpers/db.js';
import { ids, insertCfApiStub, problemAt, seedProblems } from '../../../helpers/problems.js';
import { list } from '../../../../src/modules/problems/problems.service.js';

useTestDB();

beforeEach(async () => {
  await seedProblems([
    problemAt('1/A', { tags: ['math'], rating: 800, title: 'Theatre Square', description: 'Flagstones on a square.' }),
    problemAt('1/B', { tags: ['dp', 'math'], rating: 1600, description: 'Count paths in a grid.' }),
    problemAt('2/A', { tags: ['dp'], rating: 1200, editorial: 'Use prefix sums.' }),
    problemAt('3/C', { tags: ['graphs'], rating: null }),
  ]);
  await insertCfApiStub('4/A', { tags: ['dp'], rating: 1300 });
});

describe('problems.service list', () => {
  it('lists newest contest first with paging meta and no statement text', async () => {
    const { items, meta } = await list({ page: 1, limit: 20 });
    expect(ids(items)).toEqual(['4/A', '3/C', '2/A', '1/A', '1/B']);
    expect(meta).toEqual({ page: 1, limit: 20, total: 5, totalPages: 1 });
    items.forEach((item) => {
      expect(item).not.toHaveProperty('description');
      expect(item).not.toHaveProperty('editorial');
    });
  });

  it('pages through results and keeps the full total', async () => {
    const { items, meta } = await list({ page: 2, limit: 2 });
    expect(ids(items)).toEqual(['2/A', '1/A']);
    expect(meta).toEqual({ page: 2, limit: 2, total: 5, totalPages: 3 });
  });

  it('returns an empty page past the end', async () => {
    const { items, meta } = await list({ page: 9, limit: 2 });
    expect(items).toEqual([]);
    expect(meta.total).toBe(5);
  });

  it('caps the limit at 50 and uses defaults', async () => {
    expect((await list({ limit: 500 })).meta.limit).toBe(50);
    expect((await list()).meta).toMatchObject({ page: 1, limit: 20 });
  });

  it('filters by any tag or by all tags', async () => {
    expect(ids((await list({ tags: ['dp', 'graphs'] })).items)).toEqual(['4/A', '3/C', '2/A', '1/B']);
    expect(ids((await list({ tags: ['dp', 'math'], matchAll: true })).items)).toEqual(['1/B']);
  });

  it('filters by rating range (unrated problems drop out)', async () => {
    const { items, meta } = await list({ minRating: 1200, maxRating: 1300 });
    expect(ids(items)).toEqual(['4/A', '2/A']);
    expect(meta.total).toBe(2);
  });

  it('searches title and description text', async () => {
    expect(ids((await list({ q: 'theatre' })).items)).toEqual(['1/A']);
    expect(ids((await list({ q: 'grid', tags: ['dp'] })).items)).toEqual(['1/B']);
  });

  it('includes cf_api rows with defaults filled in', async () => {
    const stub = (await list({ tags: ['dp'] })).items.find((item) => item.id === '4/A');
    expect(stub).toEqual({
      id: '4/A', contestId: 4, index: 'A', title: 'Stub 4/A', rating: 1300, tags: ['dp'],
      hasEditorial: false, source: 'cf_api',
    });
  });
});
