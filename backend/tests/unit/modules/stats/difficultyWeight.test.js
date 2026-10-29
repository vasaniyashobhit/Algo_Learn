import { describe, expect, it } from 'vitest';
import { difficultyWeight } from '../../../../src/modules/stats/helpers/difficultyWeight.js';

describe('difficultyWeight', () => {
  it('is sigmoid((pr − ur) / 300)', () => {
    expect(difficultyWeight(1200, 1200)).toBe(0.5);
    expect(difficultyWeight(1500, 1200)).toBeCloseTo(0.7310586, 7);
    expect(difficultyWeight(900, 1200)).toBeCloseTo(0.2689414, 7);
    expect(difficultyWeight(1800, 1200)).toBeCloseTo(0.8807971, 7);
  });

  it('is 0.5 when either rating is unknown', () => {
    expect(difficultyWeight(null, 1200)).toBe(0.5);
    expect(difficultyWeight(1500, null)).toBe(0.5);
    expect(difficultyWeight(undefined, undefined)).toBe(0.5);
    expect(difficultyWeight(Number.NaN, 1200)).toBe(0.5);
  });

  it('accepts another scale', () => {
    expect(difficultyWeight(1300, 1200, 100)).toBeCloseTo(0.7310586, 7);
  });
});
