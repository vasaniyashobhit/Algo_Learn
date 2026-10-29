import { describe, expect, it } from 'vitest';
import { DAY_MS, ageDays, decay } from '../../../../src/modules/stats/helpers/decay.js';

const NOW = new Date('2026-10-29T12:00:00Z');
const daysAgo = (days) => new Date(NOW - days * DAY_MS);

describe('decay', () => {
  it('halves every 90 days', () => {
    expect(decay(NOW, NOW)).toBe(1);
    expect(decay(daysAgo(90), NOW)).toBeCloseTo(0.5, 12);
    expect(decay(daysAgo(180), NOW)).toBeCloseTo(0.25, 12);
    expect(decay(daysAgo(45), NOW)).toBeCloseTo(Math.SQRT1_2, 12);
  });

  it('treats a future date as today', () => {
    expect(decay(new Date(NOW.getTime() + DAY_MS), NOW)).toBe(1);
    expect(ageDays(new Date(NOW.getTime() + DAY_MS), NOW)).toBe(0);
  });

  it('accepts another half-life', () => {
    expect(decay(daysAgo(30), NOW, 30)).toBeCloseTo(0.5, 12);
  });

  it('measures age in (fractional) days', () => {
    expect(DAY_MS).toBe(86_400_000);
    expect(ageDays(daysAgo(1.5), NOW)).toBeCloseTo(1.5, 12);
  });
});
