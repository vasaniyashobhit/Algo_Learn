import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createTestApp } from '../../../helpers/testApp.js';
import { useTestDB } from '../../../helpers/db.js';
import { expectErrorShape, expectPublicUser, makeSignup } from '../../../helpers/auth.js';
import { User } from '../../../../src/modules/users/user.model.js';

useTestDB();
const app = createTestApp();
const signup = (body) => request(app).post('/api/v1/auth/signup').send(body);

describe('POST /api/v1/auth/signup', () => {
  it('creates the account and answers 201 with { token, user }', async () => {
    const body = makeSignup({ email: '  New.Coder@Example.COM ' });
    const res = await signup(body);
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toMatch(/^[\w-]+\.[\w-]+\.[\w-]+$/);
    expectPublicUser(res.body.data.user, { email: 'new.coder@example.com', name: body.name });
    expect(await User.countDocuments({ email: 'new.coder@example.com' })).toBe(1);
  });

  it('answers 409 AUTH_EMAIL_TAKEN for an existing email (case-insensitive)', async () => {
    const body = makeSignup();
    await signup(body);
    const res = await signup({ ...body, email: body.email.toUpperCase() });
    expectErrorShape(res, 409, 'AUTH_EMAIL_TAKEN');
    expect(res.body.error.message).toBe('An account with this email already exists');
  });

  it('answers 400 VALIDATION_FAILED with every field problem', async () => {
    const res = await signup({ email: 'nope', password: 'abcdefgh', name: 'A' });
    expectErrorShape(res, 400, 'VALIDATION_FAILED', [
      { field: 'body.email', message: 'Invalid email address' },
      { field: 'body.password', message: 'Password must contain at least one digit' },
      { field: 'body.name', message: 'Name must be at least 2 characters' },
    ]);
  });

  it('answers 400 VALIDATION_FAILED for an empty body', async () => {
    const res = await signup(undefined);
    expect(res.status).toBe(400);
    expect(res.body.error.details.map((d) => d.field)).toEqual(['body']);
  });

  it('answers 400 VALIDATION_FAILED for malformed JSON', async () => {
    const res = await request(app).post('/api/v1/auth/signup').set('Content-Type', 'application/json').send('{"email":');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_FAILED');
  });
});
