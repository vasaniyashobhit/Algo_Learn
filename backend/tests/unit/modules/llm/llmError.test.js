import { describe, expect, it } from 'vitest';
import { LlmError, describeLlmError } from '../../../../src/modules/llm/helpers/llmError.js';

describe('LlmError', () => {
  it('keeps status, reason and cause', () => {
    const cause = new Error('root');
    const err = new LlmError('m', { status: 429, reason: 'r', cause });
    expect(err).toMatchObject({ name: 'LlmError', message: 'm', status: 429, reason: 'r', cause });
    expect(new LlmError('plain').status).toBeUndefined();
  });

  it('describes errors briefly for logs', () => {
    expect(describeLlmError(new LlmError('x'.repeat(300), { status: 503 })))
      .toEqual({ name: 'LlmError', status: 503, reason: undefined, message: 'x'.repeat(200) });
    expect(describeLlmError('text')).toMatchObject({ message: 'text' });
  });
});
