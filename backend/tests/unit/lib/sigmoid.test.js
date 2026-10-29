import { describe, expect, it } from 'vitest';
import { sigmoid } from '../../../src/lib/sigmoid.js';

describe('sigmoid', () => {
  it('is 0.5 at 0 and symmetric around it', () => {
    expect(sigmoid(0)).toBe(0.5);
    expect(sigmoid(1)).toBeCloseTo(0.7310586, 7);
    expect(sigmoid(-1)).toBeCloseTo(0.2689414, 7);
    expect(sigmoid(2) + sigmoid(-2)).toBeCloseTo(1, 12);
  });

  it('stays inside (0, 1) for large inputs', () => {
    expect(sigmoid(50)).toBeLessThanOrEqual(1);
    expect(sigmoid(-50)).toBeGreaterThan(0);
  });
});
