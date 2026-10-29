import { STATS } from '../../../config/constants.js';
import { decay } from './decay.js';
import { difficultyWeight } from './difficultyWeight.js';

/**
 * What one problem adds to each of its topics. Solved → solvedScore d·(0.5 + w) (harder solves
 * count more); unsolved → failScore d·(1.5 − w) (failing an easy problem hurts more).
 */
export const problemContribution = ({ rating, solved, lastAt }, userRating, now) => {
  const d = decay(lastAt, now);
  const w = difficultyWeight(rating, userRating);
  return solved
    ? { solvedScore: d * (STATS.solvedBase + w), failScore: 0 }
    : { solvedScore: 0, failScore: d * (STATS.failBase - w) };
};
