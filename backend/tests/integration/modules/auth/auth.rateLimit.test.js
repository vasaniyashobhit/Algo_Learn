import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../../../../src/app.js';
import { AUTH_RATE_LIMIT } from '../../../../src/middlewares/rateLimit.js';
import { silentLogger, TEST_AUTH } from '../../../helpers/testApp.js';
import { useTestDB } from '../../../helpers/db.js';
import { bearer, signupViaApi } from '../../../helpers/auth.js';

useTestDB();

// Real default auth limit (20 / 15 min) with the global limit left at its default (300).
const buildApp = (options) => createApp({ logger: silentLogger, auth: TEST_AUTH, ...options });
const badLogin = (app) => request(app).post('/api/v1/auth/login').send({ email: 'a@b.co', password: 'x' });

describe('auth rate limit', () => {
  it('is 20 requests per 15 minutes by default', () => {
    expect(AUTH_RATE_LIMIT).toEqual({ windowMs: 900_000, limit: 20 });
  });

  it('answers 429 RATE_LIMITED after 20 login attempts from one IP', async () => {
    const app = buildApp();
    for (let i = 0; i < 20; i += 1) {
      expect((await badLogin(app)).status).toBe(401);
    }
    const res = await badLogin(app);
    expect(res.status).toBe(429);
    expect(res.body).toMatchObject({
      success: false,
      error: { code: 'RATE_LIMITED', details: { retryAfterSeconds: 900 }, requestId: res.headers['x-request-id'] },
    });
  });

  it('shares one counter between signup and login, and leaves the rest of the API alone', async () => {
    const app = buildApp({ authRateLimit: { windowMs: 60_000, limit: 2 } });
    await request(app).post('/api/v1/auth/signup').send({});
    await badLogin(app);
    expect((await request(app).post('/api/v1/auth/signup').send({})).status).toBe(429);
    expect((await badLogin(app)).status).toBe(429);
    expect((await request(app).get('/api/v1/health')).status).toBe(200);
    expect((await request(app).get('/api/v1/auth/me')).status).toBe(401);
  });

  it('does not apply the strict limit to GET /auth/me (25 calls in a row succeed)', async () => {
    const app = buildApp();
    const { token } = await signupViaApi(app);
    for (let i = 0; i < 25; i += 1) {
      expect((await request(app).get('/api/v1/auth/me').set(bearer(token))).status).toBe(200);
    }
  });

  it('still applies the global limit to GET /auth/me', async () => {
    const app = buildApp({ rateLimit: { windowMs: 60_000, limit: 2 } });
    await request(app).get('/api/v1/auth/me');
    await request(app).get('/api/v1/auth/me');
    const res = await request(app).get('/api/v1/auth/me');
    expect(res.status).toBe(429);
    expect(res.body.error.code).toBe('RATE_LIMITED');
  });
});
