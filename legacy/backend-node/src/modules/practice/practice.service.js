import mongoose from 'mongoose';
import { PracticeItem as PracticeItemModel } from './practiceItem.model.js';
import { Problem as ProblemModel } from '../problems/problem.model.js';
import { User as UserModel } from '../users/user.model.js';
import { accountGone } from '../users/helpers/accountGone.js';
import { ConflictError, NotFoundError } from '../../errors/httpErrors.js';
import { codes } from '../../errors/codes.js';
import { SUMMARY_PROJECTION } from '../problems/helpers/problemView.js';
import { toPracticeItem } from './helpers/practiceView.js';

export const problemNotFound = (id) => new NotFoundError(codes.PROBLEM_NOT_FOUND, `Problem ${id} was not found`);

const itemNotFound = (id) => new NotFoundError(codes.NOT_FOUND, `Problem ${id} is not in your practice list`);

const isDuplicateKey = (err) => err?.code === 11000;

/**
 * Practice list CRUD. Every answer carries the full item(s), each with its problem summary,
 * so the client can reconcile optimistic updates.
 */
export const createPracticeService = ({
  PracticeItem = PracticeItemModel,
  Problem = ProblemModel,
  User = UserModel,
} = {}) => {
  const summaryOf = (problemId) => Problem.findById(problemId).select(SUMMARY_PROJECTION).lean();

  const list = async (userId, { status } = {}) => {
    const docs = await PracticeItem.find({ userId, ...(status && { status }) }).sort({ createdAt: -1, _id: -1 }).lean();
    const ids = [...new Set(docs.map(({ problemId }) => problemId))];
    const problems = ids.length
      ? await Problem.find({ _id: mongoose.trusted({ $in: ids }) }).select(SUMMARY_PROJECTION).lean()
      : [];
    const byId = new Map(problems.map((problem) => [problem._id, problem]));
    return {
      items: docs.map((doc) => toPracticeItem(doc, byId.get(doc.problemId))),
      meta: { total: docs.length, status: status ?? null },
    };
  };

  const add = async (userId, { problemId, addedFrom }) => {
    if (!(await User.exists({ _id: userId }))) throw accountGone();
    const problem = await summaryOf(problemId);
    if (!problem) throw problemNotFound(problemId);
    try {
      const doc = await PracticeItem.create({ userId, problemId, addedFrom });
      return toPracticeItem(doc.toObject(), problem);
    } catch (err) {
      if (!isDuplicateKey(err)) throw err;
      throw new ConflictError(codes.PRACTICE_ITEM_EXISTS, 'This problem is already in your practice list',
        { problemId }, { cause: err });
    }
  };

  const update = async (userId, problemId, { status }) => {
    const doc = await PracticeItem.findOneAndUpdate({ userId, problemId }, { $set: { status } }, { new: true }).lean();
    if (!doc) throw itemNotFound(problemId);
    return toPracticeItem(doc, await summaryOf(problemId));
  };

  const remove = async (userId, problemId) => {
    const doc = await PracticeItem.findOneAndDelete({ userId, problemId }).lean();
    if (!doc) throw itemNotFound(problemId);
    return toPracticeItem(doc, await summaryOf(problemId));
  };

  return { list, add, update, remove };
};
