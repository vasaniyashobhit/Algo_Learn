import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import multer from 'multer';
import { mappers, toAppError } from '../../../../src/errors/mappers/index.js';
import { NotFoundError } from '../../../../src/errors/httpErrors.js';

describe('toAppError', () => {
  it('returns AppErrors unchanged', () => {
    const err = new NotFoundError();
    expect(toAppError(err)).toBe(err);
  });

  it.each([
    ['zod', z.string().safeParse(1).error, 'VALIDATION_FAILED'],
    ['mongo duplicate', Object.assign(new Error('dup'), { code: 11000 }), 'DUPLICATE_RESOURCE'],
    ['jwt', Object.assign(new Error('jwt'), { name: 'TokenExpiredError' }), 'AUTH_TOKEN_EXPIRED'],
    ['multer', new multer.MulterError('LIMIT_FILE_SIZE'), 'FILE_TOO_LARGE'],
    ['json', Object.assign(new SyntaxError('x'), { type: 'entity.parse.failed' }), 'VALIDATION_FAILED'],
  ])('picks the %s mapper', (_name, err, code) => {
    expect(toAppError(err).code).toBe(code);
  });

  it('wraps unknown errors as 500 INTERNAL_ERROR with a generic message', () => {
    const err = new Error('secret connection string leaked');
    const mapped = toAppError(err);
    expect(mapped.statusCode).toBe(500);
    expect(mapped.code).toBe('INTERNAL_ERROR');
    expect(mapped.message).not.toContain('secret');
    expect(mapped.cause).toBe(err);
  });

  it('handles non-Error throwables', () => {
    expect(toAppError('a string').code).toBe('INTERNAL_ERROR');
    expect(toAppError(undefined).code).toBe('INTERNAL_ERROR');
  });

  it('exposes six frozen mappers', () => {
    expect(mappers).toHaveLength(6);
    expect(Object.isFrozen(mappers)).toBe(true);
  });
});
