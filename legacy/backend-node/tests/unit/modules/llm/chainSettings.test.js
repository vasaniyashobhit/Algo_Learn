import { describe, expect, it } from 'vitest';
import { LLM } from '../../../../src/config/constants.js';
import { chainSettings, createLlmBreaker, createLlmBudget } from '../../../../src/modules/llm/helpers/chainSettings.js';

describe('chainSettings', () => {
  it('fills every default from LLM', () => {
    const settings = chainSettings();
    expect(settings).toMatchObject({
      tries: LLM.tries, backoffMs: LLM.backoffMs, timeoutMs: LLM.timeoutMs, deadlineMs: LLM.deadlineMs, now: Date.now,
    });
    expect(typeof settings.budget.tryTake).toBe('function');
    expect(typeof settings.breaker.isOpen).toBe('function');
  });

  it('keeps the given values', () => {
    const budget = createLlmBudget();
    expect(chainSettings({ budget, tries: 1 })).toMatchObject({ budget, tries: 1 });
  });

  it('opens the breaker for LLM.circuitOpenMs by default', () => {
    let now = 0;
    const breaker = createLlmBreaker({ now: () => now });
    breaker.trip('k');
    now = LLM.circuitOpenMs - 1;
    expect(breaker.isOpen('k')).toBe(true);
    now = LLM.circuitOpenMs;
    expect(breaker.isOpen('k')).toBe(false);
  });

  it('budget limits by provider name with a default for unknown names', () => {
    const budget = createLlmBudget({ limits: { gemini: 1 } });
    expect(budget.tryTake('gemini:a')).toBe(true);
    expect(budget.tryTake('gemini:a')).toBe(false);
    expect(budget.remaining('other:x')).toBe(LLM.defaultBudgetPerMinute);
  });
});
