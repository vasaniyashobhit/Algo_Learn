import { describe, expect, it } from 'vitest';
import { strength } from '../../../../src/modules/stats/helpers/strength.js';

describe('strength (prior smoothing)', () => {
  it('is the prior mean 0.5 without data', () => {
    expect(strength(0, 0)).toBe(0.5);
  });

  it('one solve at the user rating gives (1 + 1.5) / (1 + 3) = 0.625, not 1', () => {
    expect(strength(1, 0)).toBe(0.625);
  });

  it('even the best possible single solve (score → 1.5) stays below 2/3', () => {
    expect(strength(1.5, 0)).toBeCloseTo(2 / 3, 12);
  });

  it('one failure at the user rating gives 1.5 / 4 = 0.375', () => {
    expect(strength(0, 1)).toBe(0.375);
  });

  it('mixes solves and failures: (1 + 1.5) / (1 + 0.7689414 + 3) = 0.5242254', () => {
    expect(strength(1, 0.7689414)).toBeCloseTo(0.5242254, 6);
  });

  it('approaches 1 only with many solves', () => {
    expect(strength(10, 0)).toBeCloseTo(11.5 / 13, 12);
    expect(strength(1000, 0)).toBeLessThan(1);
  });

  it('accepts another prior', () => {
    expect(strength(1, 0, { prior: 1, priorMean: 0 })).toBe(0.5);
  });
});
