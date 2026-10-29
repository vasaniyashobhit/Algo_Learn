import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createTestApp } from '../../../helpers/testApp.js';
import { useTestDB } from '../../../helpers/db.js';
import { expectErrorShape } from '../../../helpers/auth.js';
import { insertCfApiStub, problemAt, seedProblems } from '../../../helpers/problems.js';

useTestDB();
const app = createTestApp();

describe('GET /api/v1/problems/:contestId/:index', () => {
  it('returns the full problem without auth', async () => {
    await seedProblems([problemAt('1723/GP1', { description: 'Statement', editorial: 'Idea' })]);
    const res = await request(app).get('/api/v1/problems/1723/GP1');
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      id: '1723/GP1', description: 'Statement', editorial: 'Idea', hasStatement: true,
    });
  });

  it('accepts a lowercase index and numeric indexes', async () => {
    await seedProblems([problemAt('4/B1'), problemAt('921/01')]);
    expect((await request(app).get('/api/v1/problems/4/b1')).body.data.id).toBe('4/B1');
    expect((await request(app).get('/api/v1/problems/921/01')).body.data.id).toBe('921/01');
  });

  it('returns a cf_api problem with empty text fields', async () => {
    await insertCfApiStub('2001/A', { tags: ['dp'], rating: 1500 });
    const res = await request(app).get('/api/v1/problems/2001/A');
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ source: 'cf_api', description: '', hasStatement: false });
  });

  it('returns 404 PROBLEM_NOT_FOUND for an unknown problem', async () => {
    const res = await request(app).get('/api/v1/problems/1/A');
    expectErrorShape(res, 404, 'PROBLEM_NOT_FOUND');
  });

  it.each([
    ['/api/v1/problems/abc/A', 'params.contestId'],
    ['/api/v1/problems/0/A', 'params.contestId'],
    ['/api/v1/problems/1/ABCD', 'params.index'],
    ['/api/v1/problems/1/A-1', 'params.index'],
  ])('rejects %s', async (url, field) => {
    const res = await request(app).get(url);
    expectErrorShape(res, 400, 'VALIDATION_FAILED', [{ field, message: expect.any(String) }]);
  });
});
