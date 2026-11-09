import { describe, expect, it, vi } from 'vitest';
import { createRequireCronSecret, secretsMatch } from '../../../src/middlewares/cronSecret.js';

const reqWith = (value) => ({ get: (name) => (name === 'x-cron-secret' ? value : undefined) });

describe('secretsMatch', () => {
  it('matches only the exact secret', () => {
    expect(secretsMatch('s3cret-value', 's3cret-value')).toBe(true);
    expect(secretsMatch('s3cret-valuE', 's3cret-value')).toBe(false);
    expect(secretsMatch('s3cret', 's3cret-value')).toBe(false);
  });

  it('never matches without a configured secret or a given value', () => {
    expect(secretsMatch('', '')).toBe(false);
    expect(secretsMatch(undefined, 'x')).toBe(false);
    expect(secretsMatch('x', undefined)).toBe(false);
  });
});

describe('requireCronSecret', () => {
  it('calls next() with no error for the right header', () => {
    const next = vi.fn();
    createRequireCronSecret('abc')(reqWith('abc'), {}, next);
    expect(next).toHaveBeenCalledWith();
  });

  it('forwards 403 FORBIDDEN otherwise', () => {
    const next = vi.fn();
    createRequireCronSecret('abc')(reqWith('nope'), {}, next);
    expect(next.mock.calls[0][0]).toMatchObject({ statusCode: 403, code: 'FORBIDDEN' });
  });
});
