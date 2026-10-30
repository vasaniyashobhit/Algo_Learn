import { describe, expect, it } from 'vitest';
import { ApiError, isApiError } from './ApiError.js';
import { toFieldErrors } from './fieldErrors.js';

describe('toFieldErrors', () => {
  it('maps VALIDATION_FAILED details to known fields, first message wins', () => {
    const error = new ApiError({
      status: 400,
      code: 'VALIDATION_FAILED',
      details: [
        { field: 'body.password', message: 'Password must contain at least one digit' },
        { field: 'body.password', message: 'second message' },
        { field: 'body.email', message: 'Invalid email address' },
        { field: 'body.role', message: 'Unrecognized key' },
        { field: null, message: 'no field' },
      ],
    });
    expect(toFieldErrors(error, ['email', 'password'])).toEqual({
      password: 'Password must contain at least one digit',
      email: 'Invalid email address',
    });
  });

  it('returns nothing for other codes or missing details', () => {
    expect(toFieldErrors(new ApiError({ code: 'AUTH_EMAIL_TAKEN' }), ['email'])).toEqual({});
    expect(toFieldErrors(new ApiError({ code: 'VALIDATION_FAILED', details: null }), ['email'])).toEqual({});
    expect(toFieldErrors(undefined, ['email'])).toEqual({});
  });
});

describe('ApiError', () => {
  it('carries every field with safe defaults', () => {
    const error = new ApiError();
    expect(error).toMatchObject({ status: 0, code: null, details: null, requestId: null, isNetwork: false });
    expect(error.name).toBe('ApiError');
    expect(isApiError(error)).toBe(true);
    expect(isApiError(new Error('x'))).toBe(false);
  });
});
