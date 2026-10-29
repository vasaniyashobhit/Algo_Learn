import { STATS } from '../../../config/constants.js';
import { sigmoid } from '../../../lib/sigmoid.js';

const isRating = (value) => typeof value === 'number' && Number.isFinite(value);

/**
 * sigmoid((problemRating − userRating) / 300): above 0.5 for problems harder than the user,
 * below for easier ones. 0.5 when either rating is unknown.
 */
export const difficultyWeight = (problemRating, userRating, scale = STATS.difficultyScale) =>
  isRating(problemRating) && isRating(userRating)
    ? sigmoid((problemRating - userRating) / scale)
    : STATS.neutralWeight;
