import { describe, expect, it } from 'vitest';
import { AppError, isAppError } from '../../../src/errors/AppError.js';

describe('AppError', () => {
  it('stores status, code, message and details', () => {
    const err = new AppError(418, 'TEAPOT', 'I am a teapot', { a: 1 });
    expect(err).toBeInstanceOf(Error);
    expect(err).toMatchObject({
      name: 'AppError', statusCode: 418, code: 'TEAPOT', message: 'I am a teapot',
      details: { a: 1 }, isOperational: true,
    });
  });

  it('defaults details to null and has no cause unless given', () => {
    const err = new AppError(500, 'X', 'x');
    expect(err.details).toBeNull();
    expect('cause' in err).toBe(false);
  });

  it('keeps the original error as cause', () => {
    const original = new Error('boom');
    expect(new AppError(500, 'X', 'x', null, { cause: original }).cause).toBe(original);
  });

  it('isAppError recognizes instances only', () => {
    expect(isAppError(new AppError(400, 'X', 'x'))).toBe(true);
    expect(isAppError(new Error('x'))).toBe(false);
    expect(isAppError(null)).toBe(false);
  });
});
