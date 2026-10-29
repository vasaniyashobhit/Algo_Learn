import { afterEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { createRequireAuth, readBearerToken } from '../../../src/middlewares/auth.js';
import { createTokenService } from '../../../src/modules/auth/helpers/token.js';
import { createMiniApp } from '../../helpers/testApp.js';
import { expectErrorShape } from '../../helpers/auth.js';

const tokens = createTokenService({ secret: 'k'.repeat(32), expiresIn: 1 });
const user = { id: '65f1c2b8e4a1b2c3d4e5f601', email: 'a@b.co' };
const app = createMiniApp((a) => {
  a.get('/private', createRequireAuth(tokens), (req, res) => res.json({ user: req.user }));
});

afterEach(() => vi.useRealTimers());

describe('requireAuth', () => {
  it('sets req.user = { id, email } for a valid token', async () => {
    const res = await request(app).get('/private').set('Authorization', `Bearer ${tokens.sign(user)}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ user });
  });

  it.each([[undefined], ['   ']])('answers AUTH_REQUIRED when the header is %j', async (header) => {
    const req = request(app).get('/private');
    if (header) req.set('Authorization', header);
    expectErrorShape(await req, 401, 'AUTH_REQUIRED');
  });

  it.each([
    ['Token abc.def.ghi'],
    ['Bearer'],
    ['Bearer not-a-jwt'],
    ['Bearer a.b.c extra'],
  ])('answers AUTH_INVALID_TOKEN for a malformed header %j', async (header) => {
    expectErrorShape(await request(app).get('/private').set('Authorization', header), 401, 'AUTH_INVALID_TOKEN');
  });

  it('answers AUTH_INVALID_TOKEN for a badly signed token', async () => {
    const other = createTokenService({ secret: 'z'.repeat(32) });
    const res = await request(app).get('/private').set('Authorization', `Bearer ${other.sign(user)}`);
    expectErrorShape(res, 401, 'AUTH_INVALID_TOKEN');
  });

  it('answers AUTH_TOKEN_EXPIRED for an expired token', async () => {
    const token = tokens.sign(user);
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(Date.now() + 5_000);
    const res = await request(app).get('/private').set('Authorization', `Bearer ${token}`);
    expectErrorShape(res, 401, 'AUTH_TOKEN_EXPIRED');
  });
});

describe('readBearerToken', () => {
  it('returns the token part', () => {
    expect(readBearerToken('Bearer a.b.c')).toBe('a.b.c');
    expect(readBearerToken('  Bearer a.b.c  ')).toBe('a.b.c');
  });
});
