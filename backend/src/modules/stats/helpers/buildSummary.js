import { STATS_VIEW } from '../../../config/constants.js';
import { groupByProblem } from './groupByProblem.js';
import { solvedByRating } from './ratingBands.js';
import { dailyActivity } from './activity.js';
import { toTopicStatView } from './statView.js';

const byStrongest = (a, b) => b.strength - a.strength || b.attempted - a.attempted
  || a.topicKey.localeCompare(b.topicKey);
const byWeakest = (a, b) => a.strength - b.strength || b.attempted - a.attempted
  || a.topicKey.localeCompare(b.topicKey);

/**
 * Dashboard summary from a user's submissions and topic stats. Always the same shape:
 * with no data every count is 0, lists are empty, bands and days are zero-filled.
 * Weakest topics need ≥ 3 attempted problems, so one unlucky try is not "weak".
 */
export const buildSummary = ({ submissions, stats, now }, settings = STATS_VIEW) => {
  const problems = groupByProblem(submissions);
  const singles = stats.filter(({ kind }) => kind === 'single').map(toTopicStatView);
  return {
    totals: {
      submissions: submissions.length,
      problemsAttempted: problems.length,
      problemsSolved: problems.filter(({ solved }) => solved).length,
      topicsAttempted: singles.length,
      pairsTracked: stats.length - singles.length,
    },
    strongest: singles.toSorted(byStrongest).slice(0, settings.topN),
    weakest: singles.filter(({ attempted }) => attempted >= settings.minWeakAttempts)
      .toSorted(byWeakest).slice(0, settings.topN),
    solvedByRating: solvedByRating(problems, settings),
    activity: dailyActivity(submissions, now, settings.activityDays),
  };
};
