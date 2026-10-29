import { describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { createTestApp } from '../../../helpers/testApp.js';
import { useTestDB } from '../../../helpers/db.js';
import { bearer, expectErrorShape, signupViaApi } from '../../../helpers/auth.js';
import { cfDown, cfHistory, cfUser, fakeCfClient } from '../../../helpers/codeforces.js';
import { createServices } from '../../../../src/services.js';
import { User } from '../../../../src/modules/users/user.model.js';

useTestDB();

const users = { tourist: cfUser('tourist', { rating: 3400 }) };
const appWith = (client, onSynced) => createTestApp({ services: createServices({ client, onSynced }) });

const linkedUser = async (app) => {
  const { token, user } = await signupViaApi(app);
  await request(app).put('/api/v1/users/me/handle').set(bearer(token)).send({ handle: 'tourist' });
  return { token, user };
};

describe('POST /api/v1/users/me/sync', () => {
  it('syncs and returns the counts, then calls the onSynced hook', async () => {
    const onSynced = vi.fn(async () => {});
    const app = appWith(fakeCfClient({ users, submissions: cfHistory(6) }), onSynced);
    const { token, user } = await linkedUser(app);
    const res = await request(app).post('/api/v1/users/me/sync').set(bearer(token));
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      success: true,
      data: { newSubmissions: 6, totalSubmissions: 6, lastSyncedAt: expect.any(String), pending: [] },
    });
    expect(onSynced).toHaveBeenCalledWith(user.id);
    await User.updateOne({ _id: user.id }, { lastSyncedAt: new Date(Date.now() - 21_000) });
    const again = await request(app).post('/api/v1/users/me/sync').set(bearer(token));
    expect(again.body.data).toMatchObject({ newSubmissions: 0, totalSubmissions: 6 });
  });

  it('answers 429 RATE_LIMITED with retryAfterSeconds within 20 s of the last sync', async () => {
    const app = appWith(fakeCfClient({ users, submissions: cfHistory(1) }));
    const { token } = await linkedUser(app);
    await request(app).post('/api/v1/users/me/sync').set(bearer(token));
    const res = await request(app).post('/api/v1/users/me/sync').set(bearer(token));
    expect(res.status).toBe(429);
    expect(res.body.error).toMatchObject({ code: 'RATE_LIMITED', details: { retryAfterSeconds: expect.any(Number) } });
    expect(res.body.error.details.retryAfterSeconds).toBeGreaterThan(0);
    expect(res.body.error.details.retryAfterSeconds).toBeLessThanOrEqual(20);
  });

  it('answers 400 CF_HANDLE_NOT_LINKED without a handle', async () => {
    const app = appWith(fakeCfClient({ users }));
    const { token } = await signupViaApi(app);
    expectErrorShape(await request(app).post('/api/v1/users/me/sync').set(bearer(token)), 400, 'CF_HANDLE_NOT_LINKED');
  });

  it('answers 409 SYNC_IN_PROGRESS while another sync holds the lock', async () => {
    const app = appWith(fakeCfClient({ users }));
    const { token, user } = await linkedUser(app);
    await User.updateOne({ _id: user.id }, { syncLockedUntil: new Date(Date.now() + 60_000) });
    expectErrorShape(await request(app).post('/api/v1/users/me/sync').set(bearer(token)), 409, 'SYNC_IN_PROGRESS');
  });

  it('answers 503 CF_UNAVAILABLE when Codeforces is down', async () => {
    const client = fakeCfClient({ users });
    const app = appWith(client);
    const { token } = await linkedUser(app);
    client.userStatus.mockRejectedValueOnce(cfDown());
    const res = await request(app).post('/api/v1/users/me/sync').set(bearer(token));
    expectErrorShape(res, 503, 'CF_UNAVAILABLE', { status: 503, retryable: true });
  });

  it('answers 401 AUTH_REQUIRED without a token', async () => {
    const app = appWith(fakeCfClient());
    expectErrorShape(await request(app).post('/api/v1/users/me/sync'), 401, 'AUTH_REQUIRED');
  });
});
