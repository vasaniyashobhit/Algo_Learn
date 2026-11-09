import { STATS } from '../../../config/constants.js';
import { topicKeysFor } from './topicKeys.js';
import { problemContribution } from './contribution.js';
import { addProblem, emptyTotals, toTopicStatDoc } from './topicTotals.js';

const keep = ({ kind, attempted }) => kind === 'single' || attempted >= STATS.minPairAttempts;

/**
 * Topic stats docs (without `userId`) from grouped problems. Every single topic with an
 * attempt is kept; a pair only when attempted on ≥ 2 problems (fewer says nothing useful).
 */
export const buildTopicStats = (problems, userRating, now) => {
  const totalsByKey = new Map();
  for (const problem of problems) {
    const keys = topicKeysFor(problem.tags);
    if (!keys.length) continue;
    const contribution = problemContribution(problem, userRating, now);
    for (const { topicKey, kind } of keys) {
      if (!totalsByKey.has(topicKey)) totalsByKey.set(topicKey, emptyTotals(topicKey, kind));
      addProblem(totalsByKey.get(topicKey), problem, contribution);
    }
  }
  return [...totalsByKey.values()].filter(keep).map((totals) => toTopicStatDoc(totals, userRating, now));
};
