import { describe, expect, it } from 'vitest';
import { planAttempts, STRATEGIES } from '../../../../src/modules/problems/helpers/fallbackPlan.js';
import { SIMILARITY } from '../../../../src/config/constants.js';

const strategies = (attempts) => attempts.map((attempt) => attempt.strategy);

describe('planAttempts', () => {
  it('tags + rating: primary → widened ×2 → no rating filter → near rating', () => {
    const attempts = planAttempts({ tags: ['dp'], rating: 1500, ratingWindow: 300 });
    expect(strategies(attempts)).toEqual([
      STRATEGIES.PRIMARY, STRATEGIES.WIDENED_WINDOW, STRATEGIES.NO_RATING_FILTER, STRATEGIES.NEAR_USER_RATING,
    ]);
    expect(attempts[0]).toMatchObject({ useTags: true, filterRating: true, target: 1500, window: 300 });
    expect(attempts[1]).toMatchObject({ useTags: true, filterRating: true, window: 600 });
    expect(attempts[2]).toMatchObject({ useTags: true, filterRating: false, target: 1500 });
    expect(attempts[3]).toMatchObject({ useTags: false, filterRating: false, target: 1500 });
  });

  it('tags without rating: primary has no rating filter, then near rating', () => {
    const attempts = planAttempts({ tags: ['dp'], rating: null, ratingWindow: 300 });
    expect(strategies(attempts)).toEqual([STRATEGIES.PRIMARY, STRATEGIES.NEAR_USER_RATING]);
    expect(attempts[0]).toMatchObject({ useTags: true, filterRating: false, target: null });
  });

  it('untagged with rating: ±200 band, then near rating', () => {
    const attempts = planAttempts({ tags: [], rating: 1400, ratingWindow: 300 });
    expect(strategies(attempts)).toEqual([STRATEGIES.RATING_BAND, STRATEGIES.NEAR_USER_RATING]);
    expect(attempts[0]).toMatchObject({
      useTags: false, filterRating: true, target: 1400, window: SIMILARITY.untaggedRatingBand,
    });
  });

  it('untagged and unrated: only near rating, around the default target', () => {
    const attempts = planAttempts({ tags: [] });
    expect(strategies(attempts)).toEqual([STRATEGIES.NEAR_USER_RATING]);
    expect(attempts[0].target).toBe(SIMILARITY.defaultTargetRating);
    expect(attempts[0].window).toBe(SIMILARITY.defaultRatingWindow);
  });

  it('the last attempt prefers the user rating over the problem rating', () => {
    expect(planAttempts({ tags: [], rating: 1400, userRating: 1900 }).at(-1).target).toBe(1900);
    expect(planAttempts({ tags: ['dp'], userRating: 2100 }).at(-1).target).toBe(2100);
  });
});
