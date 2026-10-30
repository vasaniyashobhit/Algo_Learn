import { describe, expect, it } from 'vitest';
import { rankFor } from './ratingRank.js';

describe('rankFor', () => {
  it.each([
    [800, 'Newbie'],
    [1199, 'Newbie'],
    [1200, 'Pupil'],
    [1487, 'Specialist'],
    [1600, 'Expert'],
    [1900, 'Candidate master'],
    [2100, 'Master'],
    [2300, 'International master'],
    [2400, 'Grandmaster'],
    [2600, 'International grandmaster'],
    [3382, 'Legendary grandmaster'],
    [-20, 'Newbie'],
  ])('%s → %s', (rating, rank) => expect(rankFor(rating)).toBe(rank));

  it('is null without a rating', () => {
    expect(rankFor(null)).toBeNull();
    expect(rankFor(undefined)).toBeNull();
  });
});
