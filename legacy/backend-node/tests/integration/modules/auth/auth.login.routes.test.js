import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createTestApp } from '../../../helpers/testApp.js';
import { useTestDB } from '../../../helpers/db.js';
import { bearer, expectErrorShape, expectPublicUser, signupViaApi } from '../../../helpers/auth.js';

useTestDB();
const app = createTestApp();
const login = (body) => request(app).post('/api/v1/auth/login').send(body);

describe('POST /api/v1/auth/login', () => {
  it('answers 200 with { token, user } and the token works', async () => {
    const { body } = await signupViaApi(app);
    const res = await login({ email: ` ${body.email.toUpperCase()} `, password: body.password });
    expect(res.status).toBe(200);
    expectPublicUser(res.body.data.user, { email: body.email, name: body.name });
    const me = await request(app).get('/api/v1/auth/me').set(bearer(res.body.data.token));
    expect(me.status).toBe(200);
  });

  it('answers 401 AUTH_INVALID_CREDENTIALS for a wrong password', async () => {
    const { body } = await signupViaApi(app);
    const res = await login({ email: body.email, password: 'wrong1234' });
    expectErrorShape(res, 401, 'AUTH_INVALID_CREDENTIALS');
    expect(res.body.error.message).toBe('Invalid email or password');
  });

  it('answers exactly the same for an unknown email (does not reveal which field was wrong)', async () => {
    const { body } = await signupViaApi(app);
    const wrongPassword = await login({ email: body.email, password: 'wrong1234' });
    const unknownEmail = await login({ email: 'ghost@example.com', password: body.password });
    expectErrorShape(unknownEmail, 401, 'AUTH_INVALID_CREDENTIALS');
    expect(unknownEmail.body.error.message).toBe(wrongPassword.body.error.message);
  });

  it('answers 400 VALIDATION_FAILED for a missing password', async () => {
    const res = await login({ email: 'a@b.co' });
    expectErrorShape(res, 400, 'VALIDATION_FAILED', [{ field: 'body.password', message: 'Password is required' }]);
  });

  it('does not accept operator objects as the email (no query injection)', async () => {
    const res = await login({ email: { $ne: null }, password: 'secret123' });
    expect(res.status).toBe(400);
    expect(res.body.error.details[0].field).toBe('body.email');
  });
});
