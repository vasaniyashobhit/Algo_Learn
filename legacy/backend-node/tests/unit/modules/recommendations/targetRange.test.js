import { describe, expect, it } from 'vitest';
import { baseRating, targetRange } from '../../../../src/modules/recommendations/helpers/targetRange.js';

describe('targetRange', () => {
  it('is [comfort + 100, comfort + 300]', () => {
    expect(targetRange(1400)).toEqual([1500, 1700]);
  });

  it('rounds each bound to the nearest 100', () => {
    expect(targetRange(1449)).toEqual([1500, 1700]);
    expect(targetRange(1450)).toEqual([1600, 1800]);
    expect(targetRange(1320)).toEqual([1400, 1600]);
  });
});

describe('baseRating', () => {
  it('prefers the topic comfort, then the user rating, then 1200', () => {
    expect(baseRating(1500, 1700)).toBe(1500);
    expect(baseRating(null, 1700)).toBe(1700);
    expect(baseRating(null, null)).toBe(1200);
  });
});
