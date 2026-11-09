import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createTestApp, TEST_JWT_SECRET } from '../helpers/testApp.js';
import { BODY_LIMIT, createApp } from '../../src/app.js';
import { API_BASE_PATH } from '../../src/routes.js';

describe('createApp', () => {
  const app = createTestApp();

  it('mounts the API under /api/v1', () => {
    expect(API_BASE_PATH).toBe('/api/v1');
  });

  it('applies helmet security headers and hides x-powered-by', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  it('allows the configured client origin via CORS only', async () => {
    const allowed = await request(app).get('/api/v1/health').set('Origin', 'http://localhost:5173');
    expect(allowed.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    expect(allowed.headers['access-control-expose-headers']).toContain('X-Request-Id');
    const other = await request(app).get('/api/v1/health').set('Origin', 'https://evil.test');
    expect(other.headers['access-control-allow-origin']).not.toBe('https://evil.test');
  });

  it('returns ROUTE_NOT_FOUND for unknown routes outside /api', async () => {
    const res = await request(app).get('/nowhere');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('ROUTE_NOT_FOUND');
  });

  it('maps malformed JSON bodies to VALIDATION_FAILED', async () => {
    const res = await request(app).post('/api/v1/health').set('Content-Type', 'application/json').send('{bad');
    expect(res.status).toBe(400);
    expect(res.body.error).toMatchObject({ code: 'VALIDATION_FAILED', details: [{ field: 'body' }] });
  });

  it('rejects bodies over the limit with 413', async () => {
    expect(BODY_LIMIT).toBe('1mb');
    const big = JSON.stringify({ text: 'a'.repeat(1_100_000) });
    const res = await request(app).post('/api/v1/health').set('Content-Type', 'application/json').send(big);
    expect(res.status).toBe(413);
    expect(res.body.error.code).toBe('FILE_TOO_LARGE');
  });

  it('rate-limits /api with the RATE_LIMITED shape', async () => {
    const limited = createTestApp({ rateLimit: { windowMs: 60_000, limit: 1 } });
    await request(limited).get('/api/v1/health');
    const res = await request(limited).get('/api/v1/health');
    expect(res.status).toBe(429);
    expect(res.body.error.code).toBe('RATE_LIMITED');
  });

  it('omits stacks when built for production', async () => {
    const prodApp = createTestApp({ isProduction: true });
    const res = await request(prodApp).get('/nowhere');
    expect(res.body.error.stack).toBeUndefined();
  });

  it('works with defaults plus an auth secret', async () => {
    const res = await request(createApp({ auth: { jwtSecret: TEST_JWT_SECRET } })).get('/api/v1/health');
    expect(res.status).toBe(200);
  });

  it('refuses to build without a JWT secret', () => {
    expect(() => createApp()).toThrow('auth.jwtSecret is required');
  });
});
