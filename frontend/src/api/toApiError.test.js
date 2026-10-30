import { describe, expect, it } from 'vitest';
import { ApiError } from '../errors/ApiError.js';
import { toApiError } from './toApiError.js';

describe('toApiError', () => {
  it('passes ApiErrors through untouched', () => {
    const error = new ApiError({ status: 400 });
    expect(toApiError(error)).toBe(error);
  });

  it('marks axios timeouts', () => {
    expect(toApiError({ code: 'ECONNABORTED' })).toMatchObject({ isTimeout: true, isNetwork: false });
    expect(toApiError({ code: 'ETIMEDOUT' }).isTimeout).toBe(true);
  });

  it('marks failures without a response as network errors', () => {
    expect(toApiError(new Error('boom'))).toMatchObject({ isNetwork: true, status: 0, code: null });
    expect(toApiError(undefined).isNetwork).toBe(true);
  });

  it('reads code, details and request id from the envelope', () => {
    const error = toApiError({
      response: {
        status: 400,
        headers: {},
        data: { error: { code: 'VALIDATION_FAILED', message: 'Request validation failed', details: [], requestId: 'r-9' } },
      },
    });
    expect(error).toMatchObject({ status: 400, code: 'VALIDATION_FAILED', details: [], requestId: 'r-9' });
  });

  it('copes with non-envelope bodies and takes the id from the header', () => {
    const error = toApiError({ response: { status: 502, headers: { 'x-request-id': 'h-1' }, data: '<html>' } });
    expect(error).toMatchObject({ status: 502, code: null, message: 'HTTP 502', requestId: 'h-1', details: null });
  });

  it('reads the id from AxiosHeaders-style objects', () => {
    const headers = { get: (name) => (name === 'x-request-id' ? 'h-2' : null) };
    expect(toApiError({ response: { status: 500, headers, data: {} } }).requestId).toBe('h-2');
  });
});
