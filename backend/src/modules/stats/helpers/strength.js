import { STATS } from '../../../config/constants.js';

/**
 * Smoothed strength in (0, 1): `prior` virtual attempts at `priorMean` (0.5), so a topic with
 * no data is 0.5 and a single solve can never reach 1.
 */
export const strength = (solvedScore, failScore, { prior = STATS.prior, priorMean = STATS.priorMean } = {}) =>
  (solvedScore + prior * priorMean) / (solvedScore + failScore + prior);
