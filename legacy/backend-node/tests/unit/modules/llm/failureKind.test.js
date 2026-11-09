import { describe, expect, it } from 'vitest';
import { failureKind } from '../../../../src/modules/llm/helpers/failureKind.js';
import { LlmError } from '../../../../src/modules/llm/helpers/llmError.js';

const withStatus = (status) => Object.assign(new Error('x'), { status });

describe('failureKind', () => {
  it.each([429, 500, 502, 504])('retries HTTP %i once', (status) => {
    expect(failureKind(withStatus(status))).toBe('retry');
  });

  it('marks 503 "high demand" and timeouts as sick (no retry)', () => {
    expect(failureKind(withStatus(503))).toBe('sick');
    expect(failureKind(Object.assign(new Error('t'), { name: 'TimeoutError' }))).toBe('sick');
    expect(failureKind(Object.assign(new Error('a'), { name: 'AbortError' }))).toBe('sick');
    expect(failureKind({ reason: 'timeout' })).toBe('sick');
  });

  it.each([400, 401, 403, 404])('fails over on HTTP %i', (status) => {
    expect(failureKind(withStatus(status))).toBe('fail');
  });

  it('reads statusCode and response.status too', () => {
    expect(failureKind({ statusCode: 503 })).toBe('sick');
    expect(failureKind({ response: { status: 429 } })).toBe('retry');
  });

  it('fails over on invalid JSON, network errors, plain bugs and non-errors', () => {
    expect(failureKind(new LlmError('bad', { reason: 'invalid_json' }))).toBe('fail');
    expect(failureKind(new TypeError('fetch failed'))).toBe('fail');
    expect(failureKind(new TypeError('x is not a function'))).toBe('fail');
    expect(failureKind(null)).toBe('fail');
    expect(failureKind('503')).toBe('fail');
  });
});
