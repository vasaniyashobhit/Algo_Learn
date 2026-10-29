import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createTestApp } from '../../../helpers/testApp.js';
import { useTestDB } from '../../../helpers/db.js';
import { bearer, expectErrorShape, signupViaApi } from '../../../helpers/auth.js';
import { cfHistory, cfUser, fakeCfClient } from '../../../helpers/codeforces.js';
import { createServices } from '../../../../src/services.js';
import { User } from '../../../../src/modules/users/user.model.js';

useTestDB();

const users = { tourist: cfUser('tourist', { rating: 1500 }) };
const appWith = (submissions = []) => createTestApp({ services: createServices({ client: fakeCfClient({ users, submissions }) }) });
const SUMMARY = '/api/v1/users/me/stats/summary';

describe('GET /api/v1/users/me/stats/summary', () => {
  it('summarizes the synced submissions', async () => {
    const app = appWith(cfHistory(4));
    const { token } = await signupViaApi(app);
    await request(app).put('/api/v1/users/me/handle').set(bearer(token)).send({ handle: 'tourist' });
    await request(app).post('/api/v1/users/me/sync').set(bearer(token));
    const res = await request(app).get(SUMMARY).set(bearer(token));
    expect(res.status).toBe(200);
    expect(res.body.meta).toEqual({ cfHandle: 'tourist', cfRating: 1500, lastSyncedAt: expect.any(String) });
    expect(res.body.data.totals).toEqual({
      submissions: 4, problemsAttempted: 4, problemsSolved: 4, topicsAttempted: 2, pairsTracked: 1,
    });
    expect(res.body.data.strongest.map(({ topicKey }) => topicKey)).toEqual(['dp', 'math']);
    expect(res.body.data.weakest).toHaveLength(2);
    expect(res.body.data.solvedByRating.bands.find(({ from }) => from === 1400).solved).toBe(4);
    expect(res.body.data.activity).toHaveLength(30);
  });

  it('returns the zero-filled summary with meta.reason NO_HANDLE', async () => {
    const app = appWith();
    const { token } = await signupViaApi(app);
    const res = await request(app).get(SUMMARY).set(bearer(token));
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.meta).toEqual({ cfHandle: null, cfRating: null, lastSyncedAt: null, reason: 'NO_HANDLE' });
    expect(Object.keys(res.body.data)).toEqual(['totals', 'strongest', 'weakest', 'solvedByRating', 'activity']);
    expect(res.body.data.totals.submissions).toBe(0);
  });

  it('answers 401 AUTH_INVALID_TOKEN when the account was deleted', async () => {
    const app = appWith();
    const { token, user } = await signupViaApi(app);
    await User.deleteOne({ _id: user.id });
    expectErrorShape(await request(app).get(SUMMARY).set(bearer(token)), 401, 'AUTH_INVALID_TOKEN');
  });

  it('answers 401 AUTH_REQUIRED without a token', async () => {
    expectErrorShape(await request(appWith()).get(SUMMARY), 401, 'AUTH_REQUIRED');
  });
});
