import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createTestApp } from '../../helpers/testApp.js';

const app = createTestApp();

describe('GET /api/v1/health', () => {
  it('returns status, uptime and ISO time', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/application\/json/);
    expect(res.body).toEqual({
      success: true,
      data: { status: 'ok', uptime: expect.any(Number), time: expect.any(String) },
    });
    expect(new Date(res.body.data.time).toISOString()).toBe(res.body.data.time);
    expect(res.body.data.uptime).toBeGreaterThanOrEqual(0);
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
