import mongoose from 'mongoose';
import { User as UserModel } from '../users/user.model.js';
import { Submission as SubmissionModel } from '../sync/submission.model.js';
import { TopicStat as TopicStatModel } from './topicStat.model.js';
import { accountGone } from '../users/helpers/accountGone.js';
import { STATS_VIEW } from '../../config/constants.js';
import { groupByProblem } from './helpers/groupByProblem.js';
import { buildTopicStats } from './helpers/buildTopicStats.js';
import { buildSummary } from './helpers/buildSummary.js';
import { toTopicStatView } from './helpers/statView.js';
import { withReason } from './helpers/emptyReason.js';

const USER_FIELDS = { cfHandle: 1, cfRating: 1, lastSyncedAt: 1 };
const SUBMISSION_FIELDS = { _id: 0, problemId: 1, problemRating: 1, problemTags: 1, verdict: 1, submittedAt: 1 };
const SORTS = {
  strength: { strength: -1, attempted: -1, topicKey: 1 },
  attempted: { attempted: -1, strength: -1, topicKey: 1 },
};

const replaceOp = (userId) => (doc) => ({
  replaceOne: { filter: { userId, topicKey: doc.topicKey }, replacement: { userId, ...doc }, upsert: true },
});

/**
 * recomputeForUser (full rebuild from submissions; stale keys deleted), getStats (one kind,
 * sorted, limited) and getSummary (dashboard). No handle → empty data + `meta.reason`.
 */
export const createStatsService = ({
  User = UserModel,
  Submission = SubmissionModel,
  TopicStat = TopicStatModel,
  now = () => new Date(),
} = {}) => {
  const loadUser = async (userId) => {
    const user = await User.findById(userId, USER_FIELDS).lean();
    if (!user) throw accountGone();
    return user;
  };
  const loadSubmissions = (userId) => Submission.find({ userId }, SUBMISSION_FIELDS).lean();

  const recomputeForUser = async (userId) => {
    const user = await loadUser(userId);
    const problems = groupByProblem(await loadSubmissions(user._id));
    const docs = buildTopicStats(problems, user.cfRating ?? null, now());
    const stale = { userId: user._id, topicKey: mongoose.trusted({ $nin: docs.map((doc) => doc.topicKey) }) };
    const result = await TopicStat.bulkWrite([{ deleteMany: { filter: stale } }, ...docs.map(replaceOp(user._id))]);
    const singles = docs.filter(({ kind }) => kind === 'single').length;
    return { singles, pairs: docs.length - singles, removed: result.deletedCount };
  };

  const getStats = async (userId, { kind = 'single', sort = 'strength', limit = STATS_VIEW.defaultLimit } = {}) => {
    const user = await loadUser(userId);
    const meta = { kind, sort, limit, total: 0, lastSyncedAt: user.lastSyncedAt ?? null };
    if (!user.cfHandle) return { items: [], meta: withReason(meta, user) };
    const filter = { userId: user._id, kind };
    const [docs, total] = await Promise.all([
      TopicStat.find(filter).sort(SORTS[sort]).limit(limit).lean(),
      TopicStat.countDocuments(filter),
    ]);
    return { items: docs.map(toTopicStatView), meta: withReason({ ...meta, total }, user) };
  };

  const getSummary = async (userId) => {
    const user = await loadUser(userId);
    const meta = withReason({
      cfHandle: user.cfHandle ?? null, cfRating: user.cfRating ?? null, lastSyncedAt: user.lastSyncedAt ?? null,
    }, user);
    if (!user.cfHandle) return { data: buildSummary({ submissions: [], stats: [], now: now() }), meta };
    const [submissions, stats] = await Promise.all([
      loadSubmissions(user._id),
      TopicStat.find({ userId: user._id }).lean(),
    ]);
    return { data: buildSummary({ submissions, stats, now: now() }), meta };
  };

  return { recomputeForUser, getStats, getSummary };
};
