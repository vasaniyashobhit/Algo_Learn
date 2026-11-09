import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createTestApp } from '../../../helpers/testApp.js';
import { useTestDB } from '../../../helpers/db.js';
import { bearer, expectErrorShape, signupViaApi } from '../../../helpers/auth.js';
import { cfHistory, cfUser, fakeCfClient } from '../../../helpers/codeforces.js';
import { createServices } from '../../../../src/services.js';

useTestDB();

const users = { tourist: cfUser('tourist', { rating: 1500 }) };
const appWith = (submissions = []) => createTestApp({ services: createServices({ client: fakeCfClient({ users, submissions }) }) });
const STATS = '/api/v1/users/me/stats';

const syncedUser = async (app) => {
  const { token } = await signupViaApi(app);
  await request(app).put('/api/v1/users/me/handle').set(bearer(token)).send({ handle: 'tourist' });
  const sync = await request(app).post('/api/v1/users/me/sync').set(bearer(token));
  expect(sync.status).toBe(200);
  return token;
};

describe('GET /api/v1/users/me/stats', () => {
  it('returns stats recomputed by the sync hook (6 solves of dp + math at 1500)', async () => {
    const app = appWith(cfHistory(6));
    const token = await syncedUser(app);
    const res = await request(app).get(STATS).set(bearer(token));
    expect(res.status).toBe(200);
    expect(res.body.data.map(({ topicKey }) => topicKey)).toEqual(['dp', 'math']);
    expect(res.body.data[0]).toMatchObject({ kind: 'single', attempted: 6, solved: 6, failed: 0, comfortRating: 1500 });
    expect(res.body.meta).toEqual({ kind: 'single', sort: 'strength', limit: 50, total: 2, lastSyncedAt: expect.any(String) });
    const pairs = await request(app).get(`${STATS}?kind=pair&sort=attempted&limit=1`).set(bearer(token));
    expect(pairs.body.data).toEqual([expect.objectContaining({ topicKey: 'dp+math', tags: ['dp', 'math'], attempted: 6 })]);
  });

  it('returns empty data with meta.reason NO_HANDLE (not an error)', async () => {
    const app = appWith();
    const { token } = await signupViaApi(app);
    const res = await request(app).get(STATS).set(bearer(token));
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      success: true,
      data: [],
      meta: { kind: 'single', sort: 'strength', limit: 50, total: 0, lastSyncedAt: null, reason: 'NO_HANDLE' },
    });
  });

  it('answers 400 VALIDATION_FAILED for a bad kind, sort or limit', async () => {
    const app = appWith();
    const { token } = await signupViaApi(app);
    const res = await request(app).get(`${STATS}?kind=triple&sort=name&limit=0`).set(bearer(token));
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_FAILED');
    expect(res.body.error.details.map(({ field }) => field).toSorted()).toEqual(['query.kind', 'query.limit', 'query.sort']);
  });

  it('answers 401 AUTH_REQUIRED without a token', async () => {
    expectErrorShape(await request(appWith()).get(STATS), 401, 'AUTH_REQUIRED');
  });
});
