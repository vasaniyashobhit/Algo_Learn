import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createRateLimiter, DEFAULT_RATE_LIMIT } from '../../../src/middlewares/rateLimit.js';
import { createMiniApp } from '../../helpers/testApp.js';

const buildApp = (options) =>
  createMiniApp((app) => {
    app.use(createRateLimiter(options));
    app.get('/ping', (_req, res) => res.json({ success: true, data: 'pong' }));
  });

describe('rateLimit middleware', () => {
  it('lets requests through under the limit with standard headers', async () => {
    const res = await request(buildApp({ windowMs: 60_000, limit: 2 })).get('/ping');
    expect(res.status).toBe(200);
    expect(res.headers.ratelimit).toBeDefined();
    expect(res.headers['x-ratelimit-limit']).toBeUndefined();
  });

  it('returns our RATE_LIMITED shape once the limit is exceeded', async () => {
    const app = buildApp({ windowMs: 60_000, limit: 2 });
    await request(app).get('/ping');
    await request(app).get('/ping');
    const res = await request(app).get('/ping');
    expect(res.status).toBe(429);
    expect(res.body).toMatchObject({
      success: false,
      error: {
        code: 'RATE_LIMITED',
        message: 'Too many requests, please slow down',
        details: { retryAfterSeconds: 60 },
        requestId: res.headers['x-request-id'],
      },
    });
  });

  it('uses a sane default window and limit', () => {
    expect(DEFAULT_RATE_LIMIT).toEqual({ windowMs: 900_000, limit: 300 });
    expect(typeof createRateLimiter()).toBe('function');
  });
});
