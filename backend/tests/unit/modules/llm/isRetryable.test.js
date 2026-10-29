import { describe, expect, it } from 'vitest';
import { isRetryable } from '../../../../src/modules/llm/helpers/isRetryable.js';
import { LlmError } from '../../../../src/modules/llm/helpers/llmError.js';

const withStatus = (status) => Object.assign(new Error('x'), { status });

describe('isRetryable', () => {
  it.each([429, 500, 502, 503, 504])('retries HTTP %i', (status) => {
    expect(isRetryable(withStatus(status))).toBe(true);
  });

  it.each([400, 401, 403, 404])('does not retry HTTP %i', (status) => {
    expect(isRetryable(withStatus(status))).toBe(false);
  });

  it('reads statusCode and response.status too', () => {
    expect(isRetryable({ statusCode: 503 })).toBe(true);
    expect(isRetryable({ response: { status: 429 } })).toBe(true);
  });

  it('retries timeouts and network errors', () => {
    expect(isRetryable(Object.assign(new Error('t'), { name: 'TimeoutError' }))).toBe(true);
    expect(isRetryable(Object.assign(new Error('a'), { name: 'AbortError' }))).toBe(true);
    expect(isRetryable({ reason: 'timeout' })).toBe(true);
    expect(isRetryable({ reason: 'network' })).toBe(true);
    expect(isRetryable(Object.assign(new Error('r'), { code: 'ECONNRESET' }))).toBe(true);
    expect(isRetryable(new TypeError('fetch failed', { cause: { code: 'UND_ERR_SOCKET' } }))).toBe(true);
    expect(isRetryable(new TypeError('fetch failed'))).toBe(true);
  });

  it('does not retry invalid JSON, plain bugs or non-errors', () => {
    expect(isRetryable(new LlmError('bad', { reason: 'invalid_json' }))).toBe(false);
    expect(isRetryable(new TypeError('x is not a function'))).toBe(false);
    expect(isRetryable(null)).toBe(false);
    expect(isRetryable('503')).toBe(false);
  });
});
