import request from 'supertest';
import { createTestApp } from './testApp.js';
import { bearer, signupViaApi } from './auth.js';
import { fakeCfClient } from './codeforces.js';
import { fakeFetch, fakeLlm, fakeLookup, fakeOcr } from './stuck.js';
import { createServices } from '../../src/services.js';

export const STUCK_PATH = '/api/v1/stuck';
const GENEROUS = { windowMs: 60_000, limit: 1_000 };

/** App whose stuck flow uses a fake LLM, OCR, fetch and DNS (no network). */
export const stuckApp = ({
  llm = fakeLlm(), ocr = fakeOcr(), fetchImpl = fakeFetch(), lookup = fakeLookup(),
  stuckRateLimit = GENEROUS,
} = {}) => createTestApp({
  services: createServices({ client: fakeCfClient(), llm, ocr, stuck: { fetchImpl, lookup } }),
  stuckRateLimit,
});

/** Signs up and returns `{ user, auth }` (auth = bearer header). */
export const stuckUser = async (app) => {
  const { token, user } = await signupViaApi(app);
  return { user, auth: bearer(token) };
};

/** JSON POST /stuck. */
export const postStuck = (app, auth, body) => request(app).post(STUCK_PATH).set(auth).send(body);

/** Multipart POST /stuck with one file. */
export const uploadStuck = (app, auth, inputType, buffer, contentType, filename = 'input') =>
  request(app).post(STUCK_PATH).set(auth).field('inputType', inputType).attach('file', buffer, { filename, contentType });
