import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { useTestDB } from '../../../helpers/db.js';
import { STATEMENT } from '../../../helpers/stuck.js';
import { STUCK_PATH, postStuck, stuckApp, stuckUser } from '../../../helpers/stuckRoutes.js';
import { STUCK } from '../../../../src/config/constants.js';

useTestDB();

describe('POST /api/v1/stuck rate limit (per user)', () => {
  it('defaults to 10 per hour', () => {
    expect(STUCK.rateLimit).toEqual({ windowMs: 3_600_000, limit: 10 });
  });

  it('limits each user separately and leaves the read routes alone', async () => {
    const app = stuckApp({ stuckRateLimit: { windowMs: 60_000, limit: 2 } });
    const first = await stuckUser(app);
    const second = await stuckUser(app);
    const body = { inputType: 'text', text: STATEMENT };
    expect((await postStuck(app, first.auth, body)).status).toBe(201);
    expect((await postStuck(app, first.auth, { inputType: 'text', text: 'short' })).status).toBe(400);
    const limited = await postStuck(app, first.auth, body);
    expect(limited.status).toBe(429);
    expect(limited.body.error).toMatchObject({ code: 'RATE_LIMITED', details: { retryAfterSeconds: 60 } });
    expect((await postStuck(app, second.auth, body)).status).toBe(201);
    expect((await request(app).get(`${STUCK_PATH}/history`).set(first.auth)).status).toBe(200);
  });
});
