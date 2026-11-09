import { afterEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { createTestApp } from '../../../helpers/testApp.js';
import { useTestDB } from '../../../helpers/db.js';
import { bearer, expectErrorShape, expectPublicUser, signupViaApi } from '../../../helpers/auth.js';
import { User } from '../../../../src/modules/users/user.model.js';

useTestDB();
const app = createTestApp();
const me = () => request(app).get('/api/v1/auth/me');

afterEach(() => vi.useRealTimers());

describe('GET /api/v1/auth/me', () => {
  it('returns the current user without passwordHash', async () => {
    const { token, body } = await signupViaApi(app);
    const res = await me().set(bearer(token));
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expectPublicUser(res.body.data, { email: body.email, name: body.name });
  });

  it('answers 401 AUTH_REQUIRED without a token', async () => {
    expectErrorShape(await me(), 401, 'AUTH_REQUIRED');
  });

  it('answers 401 AUTH_INVALID_TOKEN for a malformed header', async () => {
    expectErrorShape(await me().set('Authorization', 'Basic abc'), 401, 'AUTH_INVALID_TOKEN');
  });

  it('answers 401 AUTH_TOKEN_EXPIRED for an expired token', async () => {
    const shortApp = createTestApp({ auth: { jwtSecret: 't'.repeat(32), jwtExpiresIn: 1, hashRounds: 4 } });
    const { token } = await signupViaApi(shortApp);
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(Date.now() + 5_000);
    expectErrorShape(await request(shortApp).get('/api/v1/auth/me').set(bearer(token)), 401, 'AUTH_TOKEN_EXPIRED');
  });

  it('answers 401 AUTH_INVALID_TOKEN when the account was deleted', async () => {
    const { token, user } = await signupViaApi(app);
    await User.deleteOne({ _id: user.id });
    expectErrorShape(await me().set(bearer(token)), 401, 'AUTH_INVALID_TOKEN');
  });
});
