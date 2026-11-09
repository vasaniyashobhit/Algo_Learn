import { RECOMMENDATIONS } from '../../../config/constants.js';
import { groupByProblem } from '../../stats/helpers/groupByProblem.js';

/**
 * From a user's submissions: the ids of solved problems, and the `n` most recently attempted
 * problems that were never solved (`{ problemId, tags }`, newest last submission first).
 */
export const summarizeHistory = (submissions, n = RECOMMENDATIONS.recentFailed) => {
  const problems = groupByProblem(submissions);
  const solvedIds = problems.filter(({ solved }) => solved).map(({ problemId }) => problemId);
  const recentFailed = problems
    .filter(({ solved }) => !solved)
    .toSorted((a, b) => b.lastAt - a.lastAt || a.problemId.localeCompare(b.problemId))
    .slice(0, n)
    .map(({ problemId, tags }) => ({ problemId, tags }));
  return { solvedIds, recentFailed };
};
