import { describe, expect, it } from 'vitest';
import {
  tagCountsPipeline, toTagCounts, topicFrequencyAtRating,
} from '../../../../src/modules/recommendations/helpers/topicFrequency.js';

const counts = [
  { rating: 800, total: 50, tags: { math: 50 } },
  { rating: 1200, total: 40, tags: { dp: 10, math: 20 } },
  { rating: 1500, total: 60, tags: { dp: 30, greedy: 6 } },
  { rating: 1600, total: 10, tags: { graphs: 10 } },
];

describe('toTagCounts', () => {
  it('merges the facet into one row per rating, sorted, topic tags only', () => {
    const facet = [{
      totals: [{ _id: 1500, total: 3 }, { _id: 1200, total: 2 }],
      tags: [
        { _id: { rating: 1200, tag: 'dp' }, count: 2 },
        { _id: { rating: 1500, tag: '*special' }, count: 1 },
        { _id: { rating: 1500, tag: 'math' }, count: 3 },
        { _id: { rating: 9999, tag: 'dp' }, count: 1 },
      ],
    }];
    expect(toTagCounts(facet)).toEqual([
      { rating: 1200, total: 2, tags: { dp: 2 } },
      { rating: 1500, total: 3, tags: { math: 3 } },
    ]);
  });

  it('handles an empty result', () => {
    expect(toTagCounts([])).toEqual([]);
    expect(toTagCounts()).toEqual([]);
  });

  it('builds a pipeline over rated problems only', () => {
    expect(tagCountsPipeline()[0]).toEqual({ $match: { rating: { $type: 'number' } } });
  });
});

describe('topicFrequencyAtRating', () => {
  it('uses problems within ±300 of the rating (inclusive)', () => {
    const { rating, total, frequency } = topicFrequencyAtRating(counts, 1300);
    expect({ rating, total }).toEqual({ rating: 1300, total: 110 });
    expect(frequency.dp).toBeCloseTo(40 / 110);
    expect(frequency.graphs).toBe(10 / 110);
    expect(frequency.math).toBeCloseTo(20 / 110);
  });

  it('falls back to 1200 without a rating', () => {
    const { rating, total } = topicFrequencyAtRating(counts, null);
    expect({ rating, total }).toEqual({ rating: 1200, total: 100 });
  });

  it('lists all 36 topic tags, 0 when nothing is in range', () => {
    const { total, frequency } = topicFrequencyAtRating(counts, 3000);
    expect(total).toBe(0);
    expect(Object.keys(frequency)).toHaveLength(36);
    expect(Object.values(frequency).every((share) => share === 0)).toBe(true);
  });

  it('accepts a custom window', () => {
    expect(topicFrequencyAtRating(counts, 1500, 0).total).toBe(60);
  });
});
