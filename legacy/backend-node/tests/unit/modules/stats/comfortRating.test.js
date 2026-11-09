import { describe, expect, it } from 'vitest';
import { comfortRating, median } from '../../../../src/modules/stats/helpers/comfortRating.js';
import { DAY_MS } from '../../../../src/modules/stats/helpers/decay.js';

const NOW = new Date('2026-10-29T12:00:00Z');
const solve = (rating, days = 10) => ({ rating, at: new Date(NOW - days * DAY_MS) });

describe('median', () => {
  it('takes the middle value, or the mean of the two middle values', () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 3, 2])).toBe(2.5);
    expect(median([7])).toBe(7);
  });
});

describe('comfortRating', () => {
  it('is the median of the top 5 recent solves', () => {
    const solves = [1200, 1400, 1600, 1800, 2000, 2200].map((r) => solve(r));
    // top 5 = 2200, 2000, 1800, 1600, 1400 → 1800
    expect(comfortRating(solves, 1500, NOW)).toBe(1800);
  });

  it('uses all recent solves when there are 3 or 4, rounded', () => {
    expect(comfortRating([1000, 1200, 1300].map((r) => solve(r)), 900, NOW)).toBe(1200);
    // (1101 + 1200) / 2 = 1150.5 → 1151
    expect(comfortRating([1000, 1101, 1200, 1300].map((r) => solve(r)), 900, NOW)).toBe(1151);
  });

  it('ignores solves older than 365 days for the median', () => {
    const solves = [solve(2400, 400), solve(1500), solve(1600)];
    // only 2 recent → fallback min(userRating, max solved ever = 2400)
    expect(comfortRating(solves, 1900, NOW)).toBe(1900);
    expect(comfortRating(solves, 2600, NOW)).toBe(2400);
  });

  it('counts a solve exactly 365 days old as recent', () => {
    expect(comfortRating([solve(1000, 365), solve(1100), solve(1200)], 3000, NOW)).toBe(1100);
  });

  it('falls back to whichever rating is known', () => {
    expect(comfortRating([solve(1700)], null, NOW)).toBe(1700);
    expect(comfortRating([], 1400, NOW)).toBe(1400);
    expect(comfortRating([], null, NOW)).toBeNull();
    expect(comfortRating([], undefined, NOW)).toBeNull();
  });
});
