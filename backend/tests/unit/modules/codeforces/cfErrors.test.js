import { describe, expect, it } from 'vitest';
import {
  failedStatusError, httpStatusError, invalidBodyError, isRetryableCfError,
} from '../../../../src/modules/codeforces/helpers/cfErrors.js';
import { ExternalServiceError, NotFoundError } from '../../../../src/errors/httpErrors.js';

describe('cfErrors', () => {
  it('maps "handle not found" comments to 404 CF_HANDLE_NOT_FOUND', () => {
    const err = failedStatusError('handles: User with handle nobody_xyz not found');
    expect(err).toBeInstanceOf(NotFoundError);
    expect(err).toMatchObject({ statusCode: 404, code: 'CF_HANDLE_NOT_FOUND' });
    expect(err.details.comment).toContain('nobody_xyz');
  });

  it('maps "Call limit exceeded" to a retryable 503 CF_UNAVAILABLE', () => {
    const err = failedStatusError('Call limit exceeded');
    expect(err).toMatchObject({ statusCode: 503, code: 'CF_UNAVAILABLE', details: { retryable: true } });
    expect(isRetryableCfError(err)).toBe(true);
  });

  it('maps other FAILED comments to a non-retryable 502', () => {
    const err = failedStatusError('count: Field should contain a number');
    expect(err).toBeInstanceOf(ExternalServiceError);
    expect(err).toMatchObject({ statusCode: 502, details: { retryable: false } });
    expect(isRetryableCfError(err)).toBe(false);
    expect(failedStatusError().details.comment).toBe('');
  });

  it('marks 5xx and 429 as retryable 503 and other statuses as 502', () => {
    expect(httpStatusError(504)).toMatchObject({ statusCode: 503, details: { status: 504, retryable: true } });
    expect(httpStatusError(429).details.retryable).toBe(true);
    expect(httpStatusError(403)).toMatchObject({ statusCode: 502, details: { retryable: false } });
  });

  it('wraps unreadable bodies with the cause', () => {
    const cause = new SyntaxError('bad json');
    const err = invalidBodyError(502, cause);
    expect(err).toMatchObject({ statusCode: 502, details: { retryable: true } });
    expect(err.cause).toBe(cause);
    expect(invalidBodyError(200).details.retryable).toBe(false);
  });

  it('retries timeouts and network errors but not plain errors', () => {
    expect(isRetryableCfError({ details: { reason: 'timeout' } })).toBe(true);
    expect(isRetryableCfError({ details: { reason: 'network' } })).toBe(true);
    expect(isRetryableCfError({ details: { reason: 'aborted' } })).toBe(false);
    expect(isRetryableCfError(new Error('x'))).toBe(false);
    expect(isRetryableCfError(undefined)).toBe(false);
  });
});
