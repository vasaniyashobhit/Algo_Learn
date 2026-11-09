import mongoose from 'mongoose';
import { Problem } from '../problems/problem.model.js';
import { TopicStat } from '../stats/topicStat.model.js';
import { Submission } from '../sync/submission.model.js';
import { User } from '../users/user.model.js';
import { StuckQuery } from './stuckQuery.model.js';

/** Problem fields the stuck flow needs (statement for the coach, editorial for the fallback). */
export const MATCH_FIELDS = 'title description inputFormat outputFormat note editorial rating tags';

/**
 * Database access for solve(), injectable so the service can be tested with fakes.
 * Operator filters are wrapped in mongoose.trusted() (sanitizeFilter is global); `query` and
 * `keys` are built by our own code, never raw input.
 */
export const createStuckRepository = () => ({
  findProblem: (id) => Problem.findById(id).select(MATCH_FIELDS).lean(),

  searchProblems: async (query, limit) => {
    if (!query) return [];
    return Problem.find({ $text: mongoose.trusted({ $search: query }) }, { score: { $meta: 'textScore' } })
      .sort({ score: { $meta: 'textScore' } })
      .limit(limit)
      .select(MATCH_FIELDS)
      .lean();
  },

  topicStats: (userId, keys) => TopicStat.find({ userId, topicKey: mongoose.trusted({ $in: keys }) })
    .select('topicKey kind strength attempted')
    .lean(),

  userContext: async (userId) => {
    const [user, solvedIds] = await Promise.all([
      User.findById(userId).select('cfRating').lean(),
      Submission.distinct('problemId', { userId, verdict: 'OK' }),
    ]);
    return { userRating: user?.cfRating ?? null, solvedIds };
  },

  saveQuery: async (doc) => (await StuckQuery.create(doc)).toObject(),
});
