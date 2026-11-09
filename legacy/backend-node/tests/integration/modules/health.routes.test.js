import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createTestApp } from '../../helpers/testApp.js';

const app = createTestApp();

describe('GET /api/v1/health', () => {
  it('answers 200 with status, db state, uptime and ISO time even without a database', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/application\/json/);
    expect(res.body).toEqual({
      success: true,
      data: { status: 'degraded', db: 'down', uptime: expect.any(Number), time: expect.any(String) },
    });
    expect(new Date(res.body.data.time).toISOString()).toBe(res.body.data.time);
    expect(res.body.data.uptime).toBeGreaterThanOrEqual(0);
  });

  it('readiness answers 503 DB_UNAVAILABLE without a database', async () => {
    const res = await request(app).get('/api/v1/health/ready');
    expect(res.status).toBe(503);
    expect(res.body).toMatchObject({ success: false, error: { code: 'DB_UNAVAILABLE' } });
  });

  it('sets a request id header', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.headers['x-request-id']).toBeTruthy();
  });

  it('returns the error shape for unsupported methods', async () => {
    const res = await request(app).delete('/api/v1/health');
    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({ success: false, error: { code: 'ROUTE_NOT_FOUND' } });
  });
});
