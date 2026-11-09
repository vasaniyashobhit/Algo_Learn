import { describe, expect, it, vi } from 'vitest';
import bcrypt from 'bcrypt';
import { createAuthService, DEFAULT_HASH_ROUNDS } from '../../../../src/modules/auth/auth.service.js';
import { createTokenService } from '../../../../src/modules/auth/helpers/token.js';
import { User } from '../../../../src/modules/users/user.model.js';
import { useTestDB } from '../../../helpers/db.js';
import { makeSignup } from '../../../helpers/auth.js';

useTestDB();

const tokens = createTokenService({ secret: 'q'.repeat(32), expiresIn: '1h' });
const service = createAuthService({ tokens, hashRounds: 4 });

const rejectionOf = async (promise) => {
  const err = await promise.catch((e) => e);
  return { status: err.statusCode, code: err.code, message: err.message };
};

describe('auth.service signup', () => {
  it('stores a bcrypt hash (never the password) and returns a token for the new user', async () => {
    const input = makeSignup();
    const { token, user } = await service.signup(input);
    const stored = await User.findById(user.id).select('+passwordHash').lean();
    expect(stored.passwordHash).not.toBe(input.password);
    expect(bcrypt.getRounds(stored.passwordHash)).toBe(4);
    expect(await bcrypt.compare(input.password, stored.passwordHash)).toBe(true);
    expect(user).toMatchObject({ email: input.email, name: input.name });
    expect(user).not.toHaveProperty('passwordHash');
    expect(tokens.verify(token)).toEqual({ id: user.id, email: input.email });
  });

  it('uses bcrypt cost 12 by default', async () => {
    expect(DEFAULT_HASH_ROUNDS).toBe(12);
    const { user } = await createAuthService({ tokens }).signup(makeSignup());
    const stored = await User.findById(user.id).select('+passwordHash').lean();
    expect(bcrypt.getRounds(stored.passwordHash)).toBe(12);
  });

  it('rejects a duplicate email with AUTH_EMAIL_TAKEN (409)', async () => {
    const input = makeSignup();
    await service.signup(input);
    expect(await rejectionOf(service.signup({ ...input, name: 'Other' }))).toEqual({
      status: 409,
      code: 'AUTH_EMAIL_TAKEN',
      message: 'An account with this email already exists',
    });
    expect(await User.countDocuments()).toBe(1);
  });

  it('re-throws other database errors unchanged', async () => {
    const boom = new Error('db down');
    vi.spyOn(User, 'create').mockRejectedValueOnce(boom);
    await expect(service.signup(makeSignup())).rejects.toBe(boom);
  });
});

describe('auth.service login', () => {
  it('returns a token and the public user for the right password', async () => {
    const input = makeSignup();
    await service.signup(input);
    const { token, user } = await service.login({ email: input.email, password: input.password });
    expect(user).toMatchObject({ email: input.email, name: input.name });
    expect(user).not.toHaveProperty('passwordHash');
    expect(tokens.verify(token).id).toBe(user.id);
  });

  it('gives the same AUTH_INVALID_CREDENTIALS error for a wrong password and an unknown email', async () => {
    const input = makeSignup();
    await service.signup(input);
    const wrongPassword = await rejectionOf(service.login({ email: input.email, password: 'wrong1234' }));
    const unknownEmail = await rejectionOf(service.login({ email: 'nobody@example.com', password: input.password }));
    expect(wrongPassword).toEqual({ status: 401, code: 'AUTH_INVALID_CREDENTIALS', message: 'Invalid email or password' });
    expect(unknownEmail).toEqual(wrongPassword);
  });

  it('still runs a bcrypt comparison for an unknown email (timing), hashing the dummy once', async () => {
    const compare = vi.spyOn(bcrypt, 'compare');
    const hash = vi.spyOn(bcrypt, 'hash');
    const fresh = createAuthService({ tokens, hashRounds: 4 });
    await rejectionOf(fresh.login({ email: 'ghost@example.com', password: 'x' }));
    await rejectionOf(fresh.login({ email: 'ghost@example.com', password: 'y' }));
    expect(compare).toHaveBeenCalledTimes(2);
    expect(hash).toHaveBeenCalledTimes(1);
  });
});

describe('auth.service tokens', () => {
  it('issues tokens that expire after a short expiresIn', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    const shortTokens = createTokenService({ secret: 'q'.repeat(32), expiresIn: 1 });
    const { token, user } = await createAuthService({ tokens: shortTokens, hashRounds: 4 }).signup(makeSignup());
    expect(shortTokens.verify(token).id).toBe(user.id);
    vi.setSystemTime(Date.now() + 2_000);
    expect(() => shortTokens.verify(token)).toThrow(expect.objectContaining({ code: 'AUTH_TOKEN_EXPIRED' }));
    vi.useRealTimers();
  });
});
