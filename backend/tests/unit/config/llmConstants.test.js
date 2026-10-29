import { describe, expect, it } from 'vitest';
import { LLM, LLM_FALLBACK_REASONS } from '../../../src/config/constants.js';

describe('llm constants', () => {
  it('match the Session 9 chain spec', () => {
    expect(LLM).toMatchObject({
      tries: 3, backoffMs: 1000, timeoutMs: 20_000, maxHints: 3,
      ratingMin: 800, ratingMax: 3500, ratingStep: 100,
    });
    expect(LLM.budgetPerMinute).toEqual({ gemini: 8, groq: 25 });
    expect(Object.isFrozen(LLM)).toBe(true);
    expect(Object.isFrozen(LLM.budgetPerMinute)).toBe(true);
  });

  it('expose the fallback reasons', () => {
    expect(LLM_FALLBACK_REASONS).toEqual({ noInput: 'NO_INPUT', busy: 'AI_BUSY', unavailable: 'AI_UNAVAILABLE' });
  });
});
