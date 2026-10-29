import { beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createTestApp } from '../../../helpers/testApp.js';
import { useTestDB } from '../../../helpers/db.js';
import { expectErrorShape } from '../../../helpers/auth.js';
import { ids, problemAt, seedProblems } from '../../../helpers/problems.js';

useTestDB();
const app = createTestApp();

beforeEach(async () => {
  await seedProblems([
    problemAt('1/A', { tags: ['math'], rating: 800 }),
    problemAt('2/A', { tags: ['dp', 'math'], rating: 1500 }),
    problemAt('3/A', { tags: ['dp'], rating: 1900 }),
  ]);
});

describe('GET /api/v1/problems', () => {
  it('is public and returns items with pagination meta', async () => {
    const res = await request(app).get('/api/v1/problems?limit=2&page=1');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(ids(res.body.data)).toEqual(['3/A', '2/A']);
    expect(res.body.meta).toEqual({ page: 1, limit: 2, total: 3, totalPages: 2 });
    expect(res.body.data[0]).not.toHaveProperty('description');
  });

  it('applies tag (comma list), matchAll and rating filters', async () => {
    const res = await request(app).get('/api/v1/problems?tags=dp,math&matchAll=true&minRating=1000');
    expect(ids(res.body.data)).toEqual(['2/A']);
    expect(res.body.meta.total).toBe(1);
  });

  it('accepts repeated tags params', async () => {
    const res = await request(app).get('/api/v1/problems?tags=dp&tags=math&maxRating=1500');
    expect(ids(res.body.data)).toEqual(['2/A', '1/A']);
  });

  it('accepts a tag with spaces (URL-encoded)', async () => {
    const res = await request(app).get('/api/v1/problems').query({ tags: 'data structures' });
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });

  it('rejects an unknown tag', async () => {
    const res = await request(app).get('/api/v1/problems?tags=dp,nope');
    expectErrorShape(res, 400, 'VALIDATION_FAILED', [
      { field: 'query.tags.1', message: expect.any(String) },
    ]);
  });

  it('rejects limit > 50 and minRating > maxRating together', async () => {
    const res = await request(app).get('/api/v1/problems?limit=51&minRating=2000&maxRating=1000');
    expect(res.status).toBe(400);
    expect(res.body.error.details.map((issue) => issue.field).toSorted())
      .toEqual(['query.limit', 'query.minRating']);
  });

  it('rejects a non-numeric page', async () => {
    const res = await request(app).get('/api/v1/problems?page=abc');
    expectErrorShape(res, 400, 'VALIDATION_FAILED', [{ field: 'query.page', message: expect.any(String) }]);
  });
});
