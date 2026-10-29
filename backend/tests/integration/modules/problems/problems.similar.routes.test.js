import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createTestApp } from '../../../helpers/testApp.js';
import { useTestDB } from '../../../helpers/db.js';
import { expectErrorShape } from '../../../helpers/auth.js';
import { ids, problemAt, seedProblems } from '../../../helpers/problems.js';

useTestDB();
const app = createTestApp();

const URL = '/api/v1/problems/1/A/similar';

describe('GET /api/v1/problems/:contestId/:index/similar', () => {
  it('returns ranked similar problems with strategy meta, without auth', async () => {
    await seedProblems([
      problemAt('1/A', { tags: ['dp', 'greedy'], rating: 1500 }),
      problemAt('2/A', { tags: ['dp', 'greedy'], rating: 1600 }),
      problemAt('3/A', { tags: ['dp'], rating: 1500 }),
    ]);
    const res = await request(app).get(URL);
    expect(res.status).toBe(200);
    expect(ids(res.body.data)).toEqual(['2/A', '3/A']);
    expect(res.body.data[0].similarity).toEqual({
      score: expect.any(Number), jaccard: 1, ratingCloseness: expect.any(Number),
    });
    expect(res.body.meta).toEqual({
      strategy: 'primary', ratingWindow: 300, targetRating: 1500, count: 2,
      problem: { id: '1/A', title: 'Title 1/A', rating: 1500, tags: ['dp', 'greedy'] },
    });
  });

  it('honours k and ratingWindow', async () => {
    await seedProblems([
      problemAt('1/A', { tags: ['dp'], rating: 1500 }),
      problemAt('2/A', { tags: ['dp'], rating: 1540 }),
      problemAt('3/A', { tags: ['dp'], rating: 1520 }),
    ]);
    const res = await request(app).get(`${URL}?k=1&ratingWindow=50`);
    expect(ids(res.body.data)).toEqual(['3/A']);
    expect(res.body.meta).toMatchObject({ ratingWindow: 50, count: 1 });
  });

  it('falls back instead of returning nothing', async () => {
    await seedProblems([problemAt('1/A', { tags: ['flows'], rating: 1500 }), problemAt('2/A', { tags: ['math'] })]);
    const res = await request(app).get(URL);
    expect(ids(res.body.data)).toEqual(['2/A']);
    expect(res.body.meta.strategy).toBe('near_user_rating');
  });

  it('returns 404 PROBLEM_NOT_FOUND for an unknown problem', async () => {
    const res = await request(app).get(URL);
    expectErrorShape(res, 404, 'PROBLEM_NOT_FOUND');
  });

  it('rejects k above 30 and a bad ratingWindow', async () => {
    const res = await request(app).get(`${URL}?k=31&ratingWindow=10`);
    expect(res.status).toBe(400);
    expect(res.body.error.details.map((issue) => issue.field).toSorted())
      .toEqual(['query.k', 'query.ratingWindow']);
  });

  it('rejects invalid params before touching the DB', async () => {
    const res = await request(app).get('/api/v1/problems/1x/A/similar');
    expectErrorShape(res, 400, 'VALIDATION_FAILED', [{ field: 'params.contestId', message: expect.any(String) }]);
  });
});
