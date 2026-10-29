/** Recommendation and practice constants (Session 8), re-exported by constants.js: import them from there. */

/**
 * Next topics (F10). Learning zone: attempted ≥ minAttempted and strength in [minStrength, maxStrength].
 * priority = (1 − strength) · log(1 + frequency), frequency = share of problems within
 * ±frequencyWindow of the user's rating that carry the tag (counts cached for frequencyCacheMs).
 * Problems: rated [comfort + targetLow, comfort + targetHigh] (rounded to targetRounding).
 */
export const RECOMMENDATIONS = Object.freeze({
  topics: 3,
  problemsPerTopic: 5,
  minAttempted: 3,
  minStrength: 0.2,
  maxStrength: 0.75,
  frequencyWindow: 300,
  frequencyCacheMs: 60 * 60_000,
  defaultRating: 1200,
  targetLow: 100,
  targetHigh: 300,
  targetRounding: 100,
  recentFailed: 10,
});

/** A problem with the same title (case-insensitive) within this many contest ids is a Div1/Div2 copy. */
export const COPY_CONTEST_GAP = 2;

/** `basis` of a picked topic: from the learning zone, or a frequent tag (cold start / fill). */
export const TOPIC_BASES = Object.freeze({ learningZone: 'learning_zone', frequent: 'frequent' });

/** `pickedBy` of a recommended problem. */
export const PICKED_BY = Object.freeze({ targetRange: 'target_range', similar: 'similar_fallback' });

/** `reason` of a negative "I solved it" check (200, not an error). */
export const VERIFY_REASONS = Object.freeze({ notSolved: 'NOT_SOLVED_YET', judging: 'STILL_JUDGING' });
