import { describe, expect, it } from 'vitest';
import { AppError } from '../../../src/errors/AppError.js';
import { codes } from '../../../src/errors/codes.js';
import {
  AuthError, ConflictError, ExternalServiceError, ForbiddenError, NotFoundError, PayloadError,
  RateLimitError, ValidationError,
} from '../../../src/errors/httpErrors.js';

describe('http error subclasses', () => {
  it.each([
    [ValidationError, 400, codes.VALIDATION_FAILED],
    [AuthError, 401, codes.AUTH_REQUIRED],
    [ForbiddenError, 403, codes.FORBIDDEN],
    [NotFoundError, 404, codes.NOT_FOUND],
    [ConflictError, 409, codes.DUPLICATE_RESOURCE],
    [PayloadError, 415, codes.FILE_TYPE_UNSUPPORTED],
    [RateLimitError, 429, codes.RATE_LIMITED],
  ])('%o has status %i and default code %s', (ErrorClass, status, code) => {
    const err = new ErrorClass();
    expect(err).toBeInstanceOf(AppError);
    expect(err.statusCode).toBe(status);
    expect(err.code).toBe(code);
    expect(err.name).toBe(ErrorClass.name);
    expect(err.message).toBeTruthy();
  });

  it('accepts a specific code, message, details and cause', () => {
    const cause = new Error('db');
    const err = new NotFoundError(codes.PROBLEM_NOT_FOUND, 'No problem 1/Z', { id: '1/Z' }, { cause });
    expect(err).toMatchObject({ code: 'PROBLEM_NOT_FOUND', message: 'No problem 1/Z', details: { id: '1/Z' } });
    expect(err.cause).toBe(cause);
  });

  it('PayloadError uses 413 for FILE_TOO_LARGE', () => {
    expect(new PayloadError(codes.FILE_TOO_LARGE).statusCode).toBe(413);
  });

  it('ExternalServiceError defaults to 502 and accepts 503', () => {
    expect(new ExternalServiceError(codes.CF_UNAVAILABLE).statusCode).toBe(502);
    const cause = new Error('down');
    const err = new ExternalServiceError(codes.CF_UNAVAILABLE, 'Down', null, { statusCode: 503, cause });
    expect(err.statusCode).toBe(503);
    expect(err.cause).toBe(cause);
  });
});
