import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createTestApp } from '../../../helpers/testApp.js';
import { useTestDB } from '../../../helpers/db.js';
import { bearer, expectErrorShape, signupViaApi } from '../../../helpers/auth.js';
import { problemAt, seedProblems } from '../../../helpers/problems.js';
import { cfHistory, cfUser, fakeCfClient } from '../../../helpers/codeforces.js';
import { createServices } from '../../../../src/services.js';
import { createTestRecommendationsService } from '../../../helpers/recommendations.js';

useTestDB();

const users = { tourist: cfUser('tourist', { rating: 1400 }) };
const appWith = (submissions = []) => createTestApp({
  services: createServices({
    client: fakeCfClient({ users, submissions }),
    recommendationsService: createTestRecommendationsService(),
  }),
});
const URL = '/api/v1/recommendations';

describe('GET /api/v1/recommendations', () => {
  it('recommends topics and problems after a sync, excluding solved ones', async () => {
    await seedProblems([
      problemAt('1001/A', { tags: ['dp', 'math'], rating: 1500 }),
      problemAt('2000/A', { tags: ['dp'], rating: 1700 }),
    ]);
    const app = appWith(cfHistory(3));
    const { token } = await signupViaApi(app);
    await request(app).put('/api/v1/users/me/handle').set(bearer(token)).send({ handle: 'tourist' });
    await request(app).post('/api/v1/users/me/sync').set(bearer(token));
    const res = await request(app).get(URL).set(bearer(token));
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.topics).toHaveLength(3);
    const ids = res.body.data.topics.flatMap(({ problems }) => problems.map(({ id }) => id));
    expect(ids).toContain('2000/A');
    expect(ids).not.toContain('1001/A');
    expect(res.body.data.topics[0]).toEqual(expect.objectContaining({
      topic: expect.any(String), basis: expect.any(String), reason: expect.any(String),
      targetRange: { min: expect.any(Number), max: expect.any(Number) },
    }));
    expect(res.body.meta).toMatchObject({ userRating: 1400, coldStart: false, recentFailed: 0 });
  });

  it('is never blank for a new account (cold start, NO_HANDLE)', async () => {
    await seedProblems([problemAt('1/A', { tags: ['math'], rating: 1200 })]);
    const app = appWith();
    const { token } = await signupViaApi(app);
    const res = await request(app).get(URL).set(bearer(token));
    expect(res.status).toBe(200);
    expect(res.body.data.topics[0]).toMatchObject({ topic: 'math', basis: 'frequent' });
    expect(res.body.data.topics[0].problems.map(({ id }) => id)).toEqual(['1/A']);
    expect(res.body.meta).toMatchObject({ coldStart: true, reason: 'NO_HANDLE' });
  });

  it('answers 401 AUTH_REQUIRED without a token', async () => {
    expectErrorShape(await request(appWith()).get(URL), 401, 'AUTH_REQUIRED');
  });
});
