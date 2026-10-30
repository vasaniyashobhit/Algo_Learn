import { describe, expect, it } from 'vitest';
import { ApiError } from '../errors/ApiError.js';
import { createQueryClient, shouldRetry } from './queryClient.js';

describe('query client', () => {
  it('never retries client errors', () => {
    expect(shouldRetry(0, new ApiError({ status: 400 }))).toBe(false);
    expect(shouldRetry(0, new ApiError({ status: 404 }))).toBe(false);
    expect(shouldRetry(0, new ApiError({ status: 429 }))).toBe(false);
  });

  it('retries network errors, timeouts and 5xx up to twice', () => {
    expect(shouldRetry(0, new ApiError({ isNetwork: true }))).toBe(true);
    expect(shouldRetry(1, new ApiError({ isTimeout: true }))).toBe(true);
    expect(shouldRetry(1, new ApiError({ status: 503 }))).toBe(true);
    expect(shouldRetry(2, new ApiError({ status: 503 }))).toBe(false);
    expect(shouldRetry(0, undefined)).toBe(true);
  });

  it('creates a client with the retry rule and no mutation retries', () => {
    const client = createQueryClient();
    const { queries, mutations } = client.getDefaultOptions();
    expect(queries.retry).toBe(shouldRetry);
    expect(queries.refetchOnWindowFocus).toBe(false);
    expect(mutations.retry).toBe(false);
  });
});
