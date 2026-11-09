import { describe, expect, it } from 'vitest';
import {
  jaccard, ratingCloseness, similarityScore, topicTagsOf,
} from '../../../../src/modules/problems/helpers/similarity.js';
import { SIMILARITY } from '../../../../src/config/constants.js';

describe('topicTagsOf', () => {
  it('drops *special, unknown tags and duplicates, keeping order', () => {
    expect(topicTagsOf(['dp', '*special', 'nope', 'greedy', 'dp'])).toEqual(['dp', 'greedy']);
  });

  it('treats null/undefined as no tags', () => {
    expect(topicTagsOf(undefined)).toEqual([]);
    expect(topicTagsOf(null)).toEqual([]);
  });
});

describe('jaccard', () => {
  it('is |shared| / |union|', () => {
    expect(jaccard(['dp', 'greedy'], ['dp', 'math'])).toBeCloseTo(1 / 3);
    expect(jaccard(['dp', 'greedy'], ['greedy', 'dp'])).toBe(1);
    expect(jaccard(['dp'], ['math'])).toBe(0);
  });

  it('is 0 when either side is empty (no division by zero)', () => {
    expect(jaccard([], [])).toBe(0);
    expect(jaccard([], ['dp'])).toBe(0);
    expect(jaccard(undefined, ['dp'])).toBe(0);
  });

  it('ignores *special entirely', () => {
    expect(jaccard(['*special'], ['*special'])).toBe(0);
    expect(jaccard(['dp', '*special'], ['dp'])).toBe(1);
    expect(jaccard(['dp', '*special'], ['dp', 'math', '*special'])).toBe(0.5);
  });

  it('ignores duplicates', () => {
    expect(jaccard(['dp', 'dp'], ['dp'])).toBe(1);
  });
});

describe('ratingCloseness', () => {
  it('falls linearly from 1 to 0 across the window', () => {
    expect(ratingCloseness(1500, 1500, 300)).toBe(1);
    expect(ratingCloseness(1500, 1650, 300)).toBe(0.5);
    expect(ratingCloseness(1650, 1500, 300)).toBe(0.5);
    expect(ratingCloseness(1500, 1800, 300)).toBe(0);
    expect(ratingCloseness(1500, 2500, 300)).toBe(0);
  });

  it('uses the default window when none is given', () => {
    expect(ratingCloseness(1000, 1000 + SIMILARITY.defaultRatingWindow / 2)).toBe(0.5);
  });

  it('is 0 when a rating is missing', () => {
    expect(ratingCloseness(null, 1500)).toBe(0);
    expect(ratingCloseness(1500, undefined)).toBe(0);
    expect(ratingCloseness(Number.NaN, 1500)).toBe(0);
  });

  it('handles a zero window as an exact-match test', () => {
    expect(ratingCloseness(1500, 1500, 0)).toBe(1);
    expect(ratingCloseness(1500, 1501, 0)).toBe(0);
  });
});

describe('similarityScore', () => {
  it('weights jaccard 0.75 and rating closeness 0.25', () => {
    expect(SIMILARITY.jaccardWeight + SIMILARITY.ratingWeight).toBe(1);
    expect(similarityScore(1, 1)).toBe(1);
    expect(similarityScore(1, 0)).toBe(0.75);
    expect(similarityScore(0, 1)).toBe(0.25);
    expect(similarityScore(0, 0)).toBe(0);
  });
});
