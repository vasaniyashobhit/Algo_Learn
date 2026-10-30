import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { useTestDB } from '../../helpers/db.js';
import { createTestApp } from '../../helpers/testApp.js';

describe('health with a connected database', () => {
  useTestDB();
  const app = createTestApp();

  it('reports ok and db up', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ status: 'ok', db: 'up' });
  });

  it('is ready', async () => {
    const res = await request(app).get('/api/v1/health/ready');
    expect(res.status).toBe(200);
    expect(res.body.data.db).toBe('up');
  });
});
