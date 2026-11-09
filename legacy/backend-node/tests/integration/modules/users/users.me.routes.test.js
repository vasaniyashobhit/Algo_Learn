import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createTestApp } from '../../../helpers/testApp.js';
import { useTestDB } from '../../../helpers/db.js';
import { bearer, expectErrorShape, expectPublicUser, signupViaApi } from '../../../helpers/auth.js';

useTestDB();
const app = createTestApp();

describe('GET /api/v1/users/me', () => {
  it('returns the current user without passwordHash', async () => {
    const { token, body } = await signupViaApi(app);
    const res = await request(app).get('/api/v1/users/me').set(bearer(token));
    expect(res.status).toBe(200);
    expectPublicUser(res.body.data, { email: body.email, name: body.name });
  });

  it('answers 401 AUTH_REQUIRED without a token', async () => {
    expectErrorShape(await request(app).get('/api/v1/users/me'), 401, 'AUTH_REQUIRED');
  });

  it('answers 401 AUTH_INVALID_TOKEN for a forged token', async () => {
    const res = await request(app).get('/api/v1/users/me').set(bearer('aaa.bbb.ccc'));
    expectErrorShape(res, 401, 'AUTH_INVALID_TOKEN');
  });
});

describe('PATCH /api/v1/users/me', () => {
  const patch = (token, body) => request(app).patch('/api/v1/users/me').set(bearer(token)).send(body);

  it('updates the name and returns the profile', async () => {
    const { token, body } = await signupViaApi(app);
    const res = await patch(token, { name: '  Grace Hopper ' });
    expect(res.status).toBe(200);
    expectPublicUser(res.body.data, { email: body.email, name: 'Grace Hopper' });
    const me = await request(app).get('/api/v1/users/me').set(bearer(token));
    expect(me.body.data.name).toBe('Grace Hopper');
  });

  it('answers 400 VALIDATION_FAILED for a bad name', async () => {
    const { token } = await signupViaApi(app);
    expectErrorShape(await patch(token, { name: 'x' }), 400, 'VALIDATION_FAILED', [
      { field: 'body.name', message: 'Name must be at least 2 characters' },
    ]);
  });

  it('rejects any field other than name', async () => {
    const { token } = await signupViaApi(app);
    const res = await patch(token, { name: 'Valid', email: 'evil@example.com' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_FAILED');
  });

  it('answers 401 AUTH_REQUIRED without a token, before validating', async () => {
    const res = await request(app).patch('/api/v1/users/me').send({ name: 'x' });
    expectErrorShape(res, 401, 'AUTH_REQUIRED');
  });
});
