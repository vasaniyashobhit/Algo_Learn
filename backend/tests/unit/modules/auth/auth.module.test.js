import { describe, expect, it } from 'vitest';
import jwt from 'jsonwebtoken';
import { createAuth } from '../../../../src/modules/auth/auth.module.js';

describe('createAuth', () => {
  it('wires tokens, the auth service and requireAuth', () => {
    const auth = createAuth({ jwtSecret: 'm'.repeat(32), jwtExpiresIn: '2h' });
    expect(Object.keys(auth.authService)).toEqual(['signup', 'login']);
    expect(typeof auth.requireAuth).toBe('function');
    const payload = jwt.decode(auth.tokens.sign({ id: '65f1c2b8e4a1b2c3d4e5f601', email: 'a@b.co' }));
    expect(payload.exp - payload.iat).toBe(7200);
  });

  it('defaults to a 7 day lifetime and requires a secret', () => {
    const { tokens } = createAuth({ jwtSecret: 'm'.repeat(32) });
    const payload = jwt.decode(tokens.sign({ id: '65f1c2b8e4a1b2c3d4e5f601', email: 'a@b.co' }));
    expect(payload.exp - payload.iat).toBe(7 * 24 * 3600);
    expect(() => createAuth()).toThrow('a JWT secret is required');
  });
});
