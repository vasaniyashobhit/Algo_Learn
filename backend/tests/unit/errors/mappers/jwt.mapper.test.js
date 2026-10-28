import { describe, expect, it } from 'vitest';
import jwt from 'jsonwebtoken';
import { mapJwtError } from '../../../../src/errors/mappers/jwt.mapper.js';

const SECRET = 's'.repeat(32);

const captureError = (fn) => {
  try {
    fn();
  } catch (err) {
    return err;
  }
  throw new Error('expected an error');
};

describe('mapJwtError', () => {
  it('maps an expired token to 401 AUTH_TOKEN_EXPIRED', () => {
    const token = jwt.sign({ sub: '1' }, SECRET, { expiresIn: -10 });
    const err = captureError(() => jwt.verify(token, SECRET));
    const mapped = mapJwtError(err);
    expect(mapped.statusCode).toBe(401);
    expect(mapped.code).toBe('AUTH_TOKEN_EXPIRED');
    expect(mapped.cause).toBe(err);
  });

  it('maps a bad signature to 401 AUTH_INVALID_TOKEN', () => {
    const token = jwt.sign({ sub: '1' }, SECRET);
    const mapped = mapJwtError(captureError(() => jwt.verify(token, 'other-secret')));
    expect(mapped.statusCode).toBe(401);
    expect(mapped.code).toBe('AUTH_INVALID_TOKEN');
  });

  it('maps a not-yet-valid token to AUTH_INVALID_TOKEN', () => {
    const token = jwt.sign({ sub: '1' }, SECRET, { notBefore: 60 });
    expect(mapJwtError(captureError(() => jwt.verify(token, SECRET))).code).toBe('AUTH_INVALID_TOKEN');
  });

  it('returns null for other errors', () => {
    expect(mapJwtError(new Error('x'))).toBeNull();
    expect(mapJwtError(undefined)).toBeNull();
  });
});
