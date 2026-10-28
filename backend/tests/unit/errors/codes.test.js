import { describe, expect, it } from 'vitest';
import { codes } from '../../../src/errors/codes.js';

const EXPECTED = [
  'VALIDATION_FAILED', 'AUTH_REQUIRED', 'AUTH_INVALID_TOKEN', 'AUTH_TOKEN_EXPIRED',
  'AUTH_INVALID_CREDENTIALS', 'AUTH_EMAIL_TAKEN', 'FORBIDDEN', 'ROUTE_NOT_FOUND', 'NOT_FOUND',
  'PROBLEM_NOT_FOUND', 'CF_HANDLE_NOT_FOUND', 'CF_HANDLE_TAKEN', 'CF_HANDLE_NOT_LINKED',
  'CF_UNAVAILABLE', 'SYNC_IN_PROGRESS', 'RATE_LIMITED', 'FILE_TOO_LARGE', 'FILE_TYPE_UNSUPPORTED',
  'URL_NOT_ALLOWED', 'URL_FETCH_FAILED', 'INPUT_UNREADABLE', 'PROBLEM_TEXT_TOO_SHORT',
  'PRACTICE_ITEM_EXISTS', 'STUCK_QUERY_NOT_FOUND', 'DUPLICATE_RESOURCE', 'INTERNAL_ERROR',
];

describe('codes', () => {
  it('contains exactly the agreed codes, each mapping to itself', () => {
    expect(Object.keys(codes).toSorted()).toEqual(EXPECTED.toSorted());
    Object.entries(codes).forEach(([key, value]) => expect(value).toBe(key));
  });

  it('is frozen', () => {
    expect(Object.isFrozen(codes)).toBe(true);
  });
});
