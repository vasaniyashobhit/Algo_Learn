import { SIMILARITY } from '../../../config/constants.js';

/** meta.strategy values, in the order they are tried. */
export const STRATEGIES = Object.freeze({
  PRIMARY: 'primary',
  WIDENED_WINDOW: 'widened_window',
  NO_RATING_FILTER: 'no_rating_filter',
  RATING_BAND: 'rating_band',
  NEAR_USER_RATING: 'near_user_rating',
});

const hasRating = (value) => typeof value === 'number' && Number.isFinite(value);

const taggedAttempts = (rating, window) =>
  hasRating(rating)
    ? [
      { strategy: STRATEGIES.PRIMARY, useTags: true, filterRating: true, target: rating, window },
      {
        strategy: STRATEGIES.WIDENED_WINDOW, useTags: true, filterRating: true, target: rating,
        window: window * SIMILARITY.widenFactor,
      },
      { strategy: STRATEGIES.NO_RATING_FILTER, useTags: true, filterRating: false, target: rating, window },
    ]
    : [{ strategy: STRATEGIES.PRIMARY, useTags: true, filterRating: false, target: null, window }];

const untaggedAttempts = (rating) =>
  hasRating(rating)
    ? [{
      strategy: STRATEGIES.RATING_BAND, useTags: false, filterRating: true, target: rating,
      window: SIMILARITY.untaggedRatingBand,
    }]
    : [];

/**
 * Ordered search attempts; the service stops at the first one that returns anything.
 * The last attempt has no filter at all, so it only comes back empty when nothing is left.
 */
export const planAttempts = ({ tags, rating = null, ratingWindow, userRating = null }) => {
  const window = ratingWindow ?? SIMILARITY.defaultRatingWindow;
  const first = tags.length ? taggedAttempts(rating, window) : untaggedAttempts(rating);
  const nearTarget = [userRating, rating].find(hasRating) ?? SIMILARITY.defaultTargetRating;
  return [
    ...first,
    { strategy: STRATEGIES.NEAR_USER_RATING, useTags: false, filterRating: false, target: nearTarget, window },
  ];
};
