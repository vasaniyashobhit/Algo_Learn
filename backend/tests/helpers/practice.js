import { expect } from 'vitest';
import request from 'supertest';
import { createTestApp } from './testApp.js';
import { bearer, signupViaApi } from './auth.js';
import { fakeCfClient } from './codeforces.js';
import { createServices } from '../../src/services.js';

export const PRACTICE = '/api/v1/practice';

/** App with a fake Codeforces client (defaults to an empty one). */
export const practiceApp = (client = fakeCfClient()) => createTestApp({ services: createServices({ client }) });

/** Signs up and returns `{ app, token, user, auth }` where `auth` is the bearer header. */
export const practiceUser = async (app) => {
  const { token, user } = await signupViaApi(app);
  return { token, user, auth: bearer(token) };
};

export const addItem = (app, auth, body) => request(app).post(PRACTICE).set(auth).send(body);

/** The full practice item every endpoint returns. */
export const expectItem = (item, { problemId, status = 'todo', addedFrom = 'manual' }) => {
  const [contestId, index] = problemId.split('/');
  expect(item).toEqual({
    id: expect.stringMatching(/^[a-f\d]{24}$/),
    problemId,
    status,
    addedFrom,
    createdAt: expect.any(String),
    updatedAt: expect.any(String),
    problem: expect.objectContaining({ id: problemId, contestId: Number(contestId), index }),
  });
};
