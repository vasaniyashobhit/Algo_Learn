import { RECOMMENDATIONS } from '../../../config/constants.js';

const roundTo = (value, step) => Math.round(value / step) * step;

/** [comfort + 100, comfort + 300], each bound rounded to the nearest 100. */
export const targetRange = (comfortRating, settings = RECOMMENDATIONS) => [
  roundTo(comfortRating + settings.targetLow, settings.targetRounding),
  roundTo(comfortRating + settings.targetHigh, settings.targetRounding),
];

/** The rating a topic's range starts from: topic comfort → user rating → 1200. */
export const baseRating = (comfortRating, userRating, settings = RECOMMENDATIONS) =>
  comfortRating ?? userRating ?? settings.defaultRating;
