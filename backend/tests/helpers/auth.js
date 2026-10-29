import { expect } from 'vitest';
import request from 'supertest';

let seq = 0;

/** A valid signup body with a unique email. */
export const makeSignup = (overrides = {}) => {
  seq += 1;
  return { email: `coder${seq}@example.com`, password: 'secret123', name: `Coder ${seq}`, ...overrides };
};

/** Signs up through the API and returns `{ token, user, body }` (body = what was sent). */
export const signupViaApi = async (app, overrides) => {
  const body = makeSignup(overrides);
  const res = await request(app).post('/api/v1/auth/signup').send(body);
  expect(res.status).toBe(201);
  return { ...res.body.data, body };
};

export const bearer = (token) => ({ Authorization: `Bearer ${token}` });

/** Asserts the shared error envelope with a given status and code. */
export const expectErrorShape = (res, status, code, details = null) => {
  expect(res.status).toBe(status);
  expect(res.body).toEqual({
    success: false,
    error: {
      code,
      message: expect.any(String),
      details,
      requestId: res.headers['x-request-id'],
      stack: expect.any(String),
    },
  });
};

/** The public user shape every auth/users endpoint returns. */
export const expectPublicUser = (user, { email, name }) => {
  expect(user).toEqual({
    id: expect.stringMatching(/^[a-f\d]{24}$/),
    email,
    name,
    cfHandle: null,
    cfRating: null,
    cfMaxRating: null,
    lastSyncedAt: null,
    createdAt: expect.any(String),
    updatedAt: expect.any(String),
  });
  expect(user).not.toHaveProperty('passwordHash');
};
