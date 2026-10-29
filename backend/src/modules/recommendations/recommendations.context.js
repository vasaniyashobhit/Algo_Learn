import mongoose from 'mongoose';
import { accountGone } from '../users/helpers/accountGone.js';
import { RECOMMENDATIONS } from '../../config/constants.js';
import { summarizeHistory } from './helpers/history.js';
import { createSolvedMatcher } from './helpers/solvedCopies.js';
import { topicFrequencyAtRating } from './helpers/topicFrequency.js';

const USER_FIELDS = { cfHandle: 1, cfRating: 1, lastSyncedAt: 1 };
const SUBMISSION_FIELDS = { _id: 0, problemId: 1, problemRating: 1, problemTags: 1, verdict: 1, submittedAt: 1 };

/** `{ id, title, contestId }` of each solved id; a problem missing from `problems` keeps only its id. */
const loadSolvedProblems = async (Problem, solvedIds) => {
  if (!solvedIds.length) return [];
  const docs = await Problem.find({ _id: mongoose.trusted({ $in: solvedIds }) }, { title: 1, contestId: 1 }).lean();
  const byId = new Map(docs.map((doc) => [doc._id, doc]));
  return solvedIds.map((id) => ({ id, title: byId.get(id)?.title ?? null, contestId: byId.get(id)?.contestId ?? null }));
};

/**
 * Everything getRecommendations needs about one user: rating, single-topic stats, tag
 * frequency at their rating, the recently failed problems, and what to exclude (solved ids,
 * practice-list ids, plus a matcher that also catches Div1/Div2 copies of solved problems).
 */
export const createContextLoader = ({ User, Submission, TopicStat, Problem, PracticeItem, tagCounts, settings = RECOMMENDATIONS }) =>
  async (userId) => {
    const user = await User.findById(userId, USER_FIELDS).lean();
    if (!user) throw accountGone();
    const [submissions, stats, practice, counts] = await Promise.all([
      Submission.find({ userId: user._id }, SUBMISSION_FIELDS).lean(),
      TopicStat.find({ userId: user._id, kind: 'single' }).lean(),
      PracticeItem.find({ userId: user._id }, { problemId: 1 }).lean(),
      tagCounts.get(),
    ]);
    const { solvedIds, recentFailed } = summarizeHistory(submissions, settings.recentFailed);
    const solved = await loadSolvedProblems(Problem, solvedIds);
    const userRating = user.cfRating ?? null;
    return {
      user,
      userRating,
      stats,
      freq: topicFrequencyAtRating(counts, userRating, settings.frequencyWindow),
      recentFailed,
      excludeIds: [...new Set([...solvedIds, ...practice.map(({ problemId }) => problemId)])],
      solvedTitles: [...new Set(solved.map(({ title }) => title).filter(Boolean))],
      isSolved: createSolvedMatcher(solved),
    };
  };
