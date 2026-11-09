import mongoose from 'mongoose';
import { PracticeItem as PracticeItemModel } from './practiceItem.model.js';
import { Problem as ProblemModel } from '../problems/problem.model.js';
import { Submission as SubmissionModel } from '../sync/submission.model.js';
import { codes } from '../../errors/codes.js';
import { SUMMARY_PROJECTION } from '../problems/helpers/problemView.js';
import { isSameOrCopy } from '../recommendations/helpers/solvedCopies.js';
import { toPracticeItem } from './helpers/practiceView.js';
import { verifyOutcome } from './helpers/verifyOutcome.js';
import { copyIdPrefixes } from './helpers/copyFilter.js';
import { problemNotFound } from './practice.service.js';

const toRef = (doc) => ({ id: doc._id, title: doc.title, contestId: doc.contestId });

/**
 * verify(userId, problemId): "I solved it". Syncs the user first (lock respected: 409
 * SYNC_IN_PROGRESS passes through), then looks for an OK on the problem or a Div1/Div2 copy.
 * Solved → the practice item becomes `solved` (created with addedFrom "recommendation" if
 * missing). Inside the sync cooldown the stored submissions are checked instead; if they do
 * not show a solve, the RATE_LIMITED error is passed on (a fresh check was not possible).
 */
export const createVerifyService = ({
  syncService,
  PracticeItem = PracticeItemModel,
  Problem = ProblemModel,
  Submission = SubmissionModel,
}) => {
  const syncFirst = async (userId) => {
    try {
      const { pending } = await syncService.syncUser(userId);
      return { pending, cooldown: null };
    } catch (err) {
      if (err?.code !== codes.RATE_LIMITED) throw err;
      return { pending: [], cooldown: err };
    }
  };

  const copyIdsOf = async (problem) => {
    const nearby = await Problem.find({ _id: mongoose.trusted({ $in: copyIdPrefixes(problem.contestId) }) })
      .select('title contestId').lean();
    const self = toRef(problem);
    return [...new Set([problem._id, ...nearby.filter((doc) => isSameOrCopy(self, toRef(doc))).map(({ _id }) => _id)])];
  };

  const markSolved = async (userId, problem) => {
    const doc = await PracticeItem.findOneAndUpdate(
      { userId, problemId: problem._id },
      { $set: { status: 'solved' }, $setOnInsert: { addedFrom: 'recommendation' } },
      { new: true, upsert: true, runValidators: true },
    ).lean();
    return toPracticeItem(doc, problem);
  };

  const verify = async (userId, problemId) => {
    const problem = await Problem.findById(problemId).select(SUMMARY_PROJECTION).lean();
    if (!problem) throw problemNotFound(problemId);
    const { pending, cooldown } = await syncFirst(userId);
    const ids = await copyIdsOf(problem);
    const submissions = await Submission.find(
      { userId, problemId: mongoose.trusted({ $in: ids }) },
      { _id: 0, cfSubmissionId: 1, verdict: 1 },
    ).lean();
    const outcome = verifyOutcome({ submissions, pending: pending.filter((ref) => ids.includes(ref.problemId)) });
    if (outcome.solved) return { verified: true, item: await markSolved(userId, problem) };
    if (cooldown) throw cooldown;
    return { verified: false, reason: outcome.reason };
  };

  return { verify };
};
