import { describe, expect, it } from 'vitest';
import { formatShare, topicReason } from '../../../../src/modules/recommendations/helpers/topicReason.js';

describe('formatShare', () => {
  it('rounds to a whole percent, "under 1%" for rare tags', () => {
    expect(formatShare(0.2249)).toBe('22%');
    expect(formatShare(0.004)).toBe('under 1%');
    expect(formatShare(0)).toBe('0%');
  });
});

describe('topicReason', () => {
  it('uses the solved / attempted counts and the share at the user level', () => {
    const reason = topicReason({ topic: 'dp', stat: { solved: 4, attempted: 11 }, share: 0.22, rating: 1500, ratingKnown: true });
    expect(reason).toBe("You've solved 4 of 11 dp problems; dp shows up in 22% of problems at your level");
  });

  it('names the rating when the user has none (cold start)', () => {
    expect(topicReason({ topic: 'greedy', share: 0.3, rating: 1200, ratingKnown: false }))
      .toBe('New topic for you: greedy shows up in 30% of problems rated around 1200');
  });

  it('treats a stat with no attempts as new', () => {
    expect(topicReason({ topic: 'math', stat: { attempted: 0, solved: 0 }, share: 0.1, rating: 1400, ratingKnown: true }))
      .toBe('New topic for you: math shows up in 10% of problems at your level');
  });
});
