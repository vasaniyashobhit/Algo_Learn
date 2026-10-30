import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createRateLimiter, userKey } from '../../../src/middlewares/rateLimit.js';
import { createMiniApp } from '../../helpers/testApp.js';

// Fake auth: the user id comes from a header, like requireAuth would set it.
const buildApp = () => createMiniApp((app) => {
  app.use((req, _res, next) => {
    req.user = { id: req.get('x-user') };
    next();
  });
  app.use(createRateLimiter({ windowMs: 60_000, limit: 2, keyGenerator: userKey }));
  app.get('/ping', (_req, res) => res.json({ success: true }));
});

describe('per-user rate limit', () => {
  it('keys by user id', () => {
    expect(userKey({ user: { id: 'abc' } })).toBe('user:abc');
  });

  it('counts each user separately, whatever the IP', async () => {
    const app = buildApp();
    await request(app).get('/ping').set('x-user', 'a');
    await request(app).get('/ping').set('x-user', 'a');
    const third = await request(app).get('/ping').set('x-user', 'a');
    expect(third.status).toBe(429);
    expect(third.body.error).toMatchObject({ code: 'RATE_LIMITED', details: { retryAfterSeconds: 60 } });
    expect((await request(app).get('/ping').set('x-user', 'b')).status).toBe(200);
  });
});
