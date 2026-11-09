import { describe, expect, it } from 'vitest';
import { createMinuteBudget } from '../../../src/lib/minuteBudget.js';

const clockBudget = (limit) => {
  const clock = { now: 0 };
  const budget = createMinuteBudget({ limitFor: () => limit, now: () => clock.now });
  return { clock, budget };
};

describe('createMinuteBudget', () => {
  it('allows `limit` takes per key per minute, then refuses', () => {
    const { budget } = clockBudget(2);
    expect(budget.tryTake('a')).toBe(true);
    expect(budget.tryTake('a')).toBe(true);
    expect(budget.tryTake('a')).toBe(false);
    expect(budget.remaining('a')).toBe(0);
  });

  it('keeps keys independent', () => {
    const { budget } = clockBudget(1);
    expect(budget.tryTake('a')).toBe(true);
    expect(budget.tryTake('b')).toBe(true);
    expect(budget.remaining('c')).toBe(1);
  });

  it('frees a slot once the oldest take is a minute old (sliding window)', () => {
    const { clock, budget } = clockBudget(2);
    budget.tryTake('a');
    clock.now = 30_000;
    budget.tryTake('a');
    clock.now = 59_999;
    expect(budget.tryTake('a')).toBe(false);
    clock.now = 60_000;
    expect(budget.remaining('a')).toBe(1);
    expect(budget.tryTake('a')).toBe(true);
    expect(budget.tryTake('a')).toBe(false);
  });

  it('does not count refused takes', () => {
    const { clock, budget } = clockBudget(1);
    budget.tryTake('a');
    clock.now = 50_000;
    budget.tryTake('a');
    clock.now = 60_000;
    expect(budget.tryTake('a')).toBe(true);
  });

  it('uses the per-key limit', () => {
    const budget = createMinuteBudget({ limitFor: (key) => (key === 'big' ? 3 : 0) });
    expect(budget.tryTake('none')).toBe(false);
    expect(budget.remaining('big')).toBe(3);
  });
});
