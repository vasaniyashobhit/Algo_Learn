import { describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { createTestApp } from '../../../helpers/testApp.js';
import { useTestDB } from '../../../helpers/db.js';
import { bearer, expectErrorShape, signupViaApi } from '../../../helpers/auth.js';
import { cfDown, cfUser, fakeCfClient } from '../../../helpers/codeforces.js';
import { createServices } from '../../../../src/services.js';

useTestDB();

const client = fakeCfClient({ users: { tourist: cfUser('tourist', { rating: 3382, maxRating: 4009 }) } });
const app = createTestApp({ services: createServices({ client }) });
const link = (token, body) => request(app).put('/api/v1/users/me/handle').set(bearer(token)).send(body);

describe('PUT /api/v1/users/me/handle', () => {
  it("links the handle with Codeforces' casing and rating", async () => {
    const { token } = await signupViaApi(app);
    const res = await link(token, { handle: '  TOURIST ' });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ cfHandle: 'tourist', cfRating: 3382, cfMaxRating: 4009 });
    expect(client.userInfo).toHaveBeenLastCalledWith('TOURIST');
  });

  it('can re-link the same handle', async () => {
    const { token } = await signupViaApi(app);
    await link(token, { handle: 'tourist' });
    expect((await link(token, { handle: 'Tourist' })).status).toBe(200);
  });

  it('answers 404 CF_HANDLE_NOT_FOUND for an unknown handle', async () => {
    const { token } = await signupViaApi(app);
    expectErrorShape(await link(token, { handle: 'no_such_user' }), 404, 'CF_HANDLE_NOT_FOUND');
  });

  it('answers 409 CF_HANDLE_TAKEN when another account has it (any casing)', async () => {
    const first = await signupViaApi(app);
    await link(first.token, { handle: 'tourist' });
    const second = await signupViaApi(app);
    expectErrorShape(await link(second.token, { handle: 'TOURIST' }), 409, 'CF_HANDLE_TAKEN');
  });

  it('answers 503 CF_UNAVAILABLE when Codeforces is down', async () => {
    const down = { ...fakeCfClient(), userInfo: vi.fn(async () => { throw cfDown(); }) };
    const downApp = createTestApp({ services: createServices({ client: down }) });
    const { token } = await signupViaApi(downApp);
    const res = await request(downApp).put('/api/v1/users/me/handle').set(bearer(token)).send({ handle: 'tourist' });
    expectErrorShape(res, 503, 'CF_UNAVAILABLE', { status: 503, retryable: true });
  });

  it.each([
    ['too short', { handle: 'ab' }],
    ['too long', { handle: 'a'.repeat(25) }],
    ['bad characters', { handle: 'tour ist!' }],
    ['missing', {}],
    ['extra fields', { handle: 'tourist', cfRating: 4000 }],
  ])('answers 400 VALIDATION_FAILED when the handle is %s', async (_case, body) => {
    const { token } = await signupViaApi(app);
    const res = await link(token, body);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_FAILED');
  });

  it('accepts letters, digits, _ - and .', async () => {
    const dotted = fakeCfClient({ users: { 'a.b-c_1': cfUser('A.b-C_1') } });
    const dottedApp = createTestApp({ services: createServices({ client: dotted }) });
    const { token } = await signupViaApi(dottedApp);
    const res = await request(dottedApp).put('/api/v1/users/me/handle').set(bearer(token)).send({ handle: 'a.b-c_1' });
    expect(res.body.data.cfHandle).toBe('A.b-C_1');
  });

  it('answers 401 AUTH_REQUIRED without a token', async () => {
    expectErrorShape(await request(app).put('/api/v1/users/me/handle').send({ handle: 'tourist' }), 401, 'AUTH_REQUIRED');
  });
});
