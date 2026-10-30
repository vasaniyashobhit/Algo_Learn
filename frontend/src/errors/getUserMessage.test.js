import { describe, expect, it } from 'vitest';
import { ApiError } from './ApiError.js';
import { getUserMessage, isUnexpectedError } from './getUserMessage.js';

const apiError = (fields) => new ApiError({ status: 400, ...fields });

describe('getUserMessage', () => {
  it('uses the default message for a code', () => {
    const error = apiError({ status: 401, code: 'AUTH_INVALID_CREDENTIALS', message: 'Invalid email or password' });
    expect(getUserMessage(error)).toBe("That email and password don't match. Check both and try again.");
  });

  it('uses a context override when one exists, else the default', () => {
    const error = apiError({ status: 409, code: 'AUTH_EMAIL_TAKEN' });
    expect(getUserMessage(error, 'signup')).toMatch(/Log in instead/);
    expect(getUserMessage(error, 'somewhere-else')).toBe('An account with this email already exists.');
  });

  it('fills params, with explicit params winning over server details', () => {
    const notFound = apiError({ status: 404, code: 'CF_HANDLE_NOT_FOUND' });
    expect(getUserMessage(notFound, 'linkHandle', { handle: 'tourist_x' })).toBe(
      'We couldn\'t find "tourist_x" on Codeforces. Check the spelling and try again.',
    );
    const limited = apiError({ status: 429, code: 'RATE_LIMITED', details: { retryAfterSeconds: 900 } });
    expect(getUserMessage(limited, 'login')).toBe('Too many login attempts from this network. Try again in 15 minutes.');
    expect(getUserMessage(limited, 'login', { retryAfterSeconds: 30 })).toMatch(/30 seconds/);
  });

  it('ignores array details when building params', () => {
    const error = apiError({ code: 'PROBLEM_TEXT_TOO_SHORT', details: [{ field: 'x' }] });
    expect(getUserMessage(error)).toMatch(/at least 40 characters/);
  });

  it('has dedicated network and timeout messages', () => {
    expect(getUserMessage(new ApiError({ isNetwork: true }))).toMatch(/internet connection/);
    expect(getUserMessage(new ApiError({ isTimeout: true }))).toMatch(/took too long/);
  });

  it('falls back to the HTTP status, then to a generic message', () => {
    expect(getUserMessage(apiError({ status: 503, code: 'SOMETHING_NEW' }))).toMatch(/busy or restarting/);
    expect(getUserMessage(apiError({ status: 418 }))).toBe('Something went wrong. Try again in a moment.');
    expect(getUserMessage(undefined)).toBe('Something went wrong. Try again in a moment.');
  });

  it('never returns the raw server message', () => {
    const error = apiError({ status: 500, code: 'INTERNAL_ERROR', message: 'TypeError: x is undefined at foo.js:12' });
    expect(getUserMessage(error)).not.toMatch(/TypeError/);
  });
});

describe('isUnexpectedError', () => {
  it('is true for INTERNAL_ERROR, 5xx and unknown codes', () => {
    expect(isUnexpectedError(apiError({ status: 500, code: 'INTERNAL_ERROR' }))).toBe(true);
    expect(isUnexpectedError(apiError({ status: 503, code: 'DB_UNAVAILABLE' }))).toBe(true);
    expect(isUnexpectedError(apiError({ status: 400, code: 'BRAND_NEW' }))).toBe(true);
  });

  it('is false for known client errors, network errors and timeouts', () => {
    expect(isUnexpectedError(apiError({ status: 401, code: 'AUTH_INVALID_CREDENTIALS' }))).toBe(false);
    expect(isUnexpectedError(new ApiError({ isNetwork: true }))).toBe(false);
    expect(isUnexpectedError(new ApiError({ isTimeout: true }))).toBe(false);
  });
});
