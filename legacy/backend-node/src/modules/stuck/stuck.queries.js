import { STUCK, STUCK_FALLBACK_NOTICE } from '../../config/constants.js';
import { NotFoundError } from '../../errors/httpErrors.js';
import { codes } from '../../errors/codes.js';
import { Problem } from '../problems/problem.model.js';
import { StuckQuery } from './stuckQuery.model.js';
import { HISTORY_PROJECTION, toHistoryItem, toStuckResult } from './helpers/stuckView.js';

const OBJECT_ID = /^[a-f0-9]{24}$/i;

const notFound = () => new NotFoundError(codes.STUCK_QUERY_NOT_FOUND, 'This stuck query was not found');

// A malformed id, an unknown id and another user's id all look the same: not found.
const ownFilter = (userId, id) => {
  if (!OBJECT_ID.test(String(id))) throw notFound();
  return { _id: id, userId };
};

const editorialOf = async (problemId) => {
  if (!problemId) return null;
  const problem = await Problem.findById(problemId).select('editorial').lean();
  return String(problem?.editorial ?? '').trim() || null;
};

/** Read and delete side of /stuck: history, one result, its solution, delete. Always per user. */
export const createStuckQueries = () => ({
  history: async (userId, { page = 1 } = {}) => {
    const limit = STUCK.historyLimit;
    const [docs, total] = await Promise.all([
      StuckQuery.find({ userId }).select(HISTORY_PROJECTION).sort({ createdAt: -1, _id: -1 })
        .skip((page - 1) * limit).limit(limit).lean(),
      StuckQuery.countDocuments({ userId }),
    ]);
    return { items: docs.map(toHistoryItem), meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  },

  get: async (userId, id) => {
    const doc = await StuckQuery.findOne(ownFilter(userId, id)).select('-solution -rawInput').lean();
    if (!doc) throw notFound();
    return toStuckResult(doc);
  },

  /** The full AI solution and/or the editorial; `kind` none (with a notice) when neither exists. */
  solution: async (userId, id) => {
    const doc = await StuckQuery.findOne(ownFilter(userId, id)).select('solution matchedProblemId result.similar').lean();
    if (!doc) throw notFound();
    const editorial = await editorialOf(doc.matchedProblemId);
    const kind = doc.solution ? 'ai' : editorial ? 'editorial' : 'none';
    const similarWithEditorial = (doc.result?.similar?.items ?? []).filter(({ hasEditorial }) => hasEditorial);
    return {
      id: String(doc._id),
      kind,
      solution: doc.solution ?? null,
      editorial,
      notice: kind === 'none' ? STUCK_FALLBACK_NOTICE : null,
      similarWithEditorial,
    };
  },

  remove: async (userId, id) => {
    const { deletedCount } = await StuckQuery.deleteOne(ownFilter(userId, id));
    if (!deletedCount) throw notFound();
    return { id, deleted: true };
  },
});
