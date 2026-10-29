import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../../../../src/app.js';
import { AUTH_RATE_LIMIT } from '../../../../src/middlewares/rateLimit.js';
import { silentLogger, TEST_AUTH } from '../../../helpers/testApp.js';
import { useTestDB } from '../../../helpers/db.js';

useTestDB();

// Real default auth limit (20 / 15 min) with the generous global limit left at its default (300).
const buildApp = () => createApp({ logger: silentLogger, auth: TEST_AUTH });
const badLogin = (app) => request(app).post('/api/v1/auth/login').send({ email: 'a@b.co', password: 'x' });

describe('auth rate limit', () => {
  it('is 20 requests per 15 minutes by default', () => {
    expect(AUTH_RATE_LIMIT).toEqual({ windowMs: 900_000, limit: 20 });
  });

  it('answers 429 RATE_LIMITED after 20 /auth requests from one IP', async () => {
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

  it('counts every /auth route, but not the rest of the API', async () => {
    const app = createApp({ logger: silentLogger, auth: TEST_AUTH, authRateLimit: { windowMs: 60_000, limit: 2 } });
    await request(app).get('/api/v1/auth/me');
    await request(app).post('/api/v1/auth/signup').send({});
    expect((await request(app).get('/api/v1/auth/me')).status).toBe(429);
    expect((await request(app).get('/api/v1/health')).status).toBe(200);
    expect((await request(app).get('/api/v1/users/me')).status).toBe(401);
  });
});
