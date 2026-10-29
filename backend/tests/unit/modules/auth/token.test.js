import { afterEach, describe, expect, it, vi } from 'vitest';
import jwt from 'jsonwebtoken';
import { createTokenService, signToken, verifyToken } from '../../../../src/modules/auth/helpers/token.js';

const secret = 's'.repeat(32);
const user = { id: '65f1c2b8e4a1b2c3d4e5f601', email: 'a@b.co' };

const codeOf = (fn) => {
  try {
    fn();
  } catch (err) {
    return [err.statusCode, err.code];
  }
  return null;
};

afterEach(() => vi.useRealTimers());

describe('signToken / verifyToken', () => {
  it('round-trips the user id (sub) and email', () => {
    const token = signToken(user, { secret, expiresIn: '1h' });
    const decoded = jwt.decode(token, { complete: true });
    expect(decoded.header.alg).toBe('HS256');
    expect(decoded.payload).toMatchObject({ sub: user.id, email: user.email });
    expect(decoded.payload.exp - decoded.payload.iat).toBe(3600);
    expect(verifyToken(token, { secret })).toEqual(user);
  });

  it('rejects an expired token with AUTH_TOKEN_EXPIRED', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    const token = signToken(user, { secret, expiresIn: 1 });
    vi.setSystemTime(Date.now() + 2_000);
    expect(codeOf(() => verifyToken(token, { secret }))).toEqual([401, 'AUTH_TOKEN_EXPIRED']);
  });

  it.each([
    ['a token signed with another secret', () => signToken(user, { secret: 'o'.repeat(32), expiresIn: '1h' })],
    ['garbage', () => 'not.a.jwt'],
    ['a token with a non-ObjectId subject', () => jwt.sign({ email: 'a@b.co' }, secret, { subject: 'admin' })],
    ['a token without an email', () => jwt.sign({}, secret, { subject: user.id })],
    ['an unsigned (alg none) token', () => jwt.sign({ email: 'a@b.co' }, null, { subject: user.id, algorithm: 'none' })],
  ])('rejects %s with AUTH_INVALID_TOKEN', (_label, makeToken) => {
    expect(codeOf(() => verifyToken(makeToken(), { secret }))).toEqual([401, 'AUTH_INVALID_TOKEN']);
  });

  it('wraps non-JWT verification failures as AUTH_INVALID_TOKEN', () => {
    vi.spyOn(jwt, 'verify').mockImplementationOnce(() => {
      throw new Error('weird');
    });
    expect(codeOf(() => verifyToken('x.y.z', { secret }))).toEqual([401, 'AUTH_INVALID_TOKEN']);
  });
});

describe('createTokenService', () => {
  it('binds sign and verify to one secret', () => {
    const tokens = createTokenService({ secret });
    const payload = jwt.decode(tokens.sign(user));
    expect(payload.exp - payload.iat).toBe(7 * 24 * 3600);
    expect(tokens.verify(tokens.sign(user))).toEqual(user);
  });

  it('requires a secret', () => {
    expect(() => createTokenService({})).toThrow('a JWT secret is required');
  });
});
