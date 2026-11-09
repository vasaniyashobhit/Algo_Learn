import { toProblemSummary } from '../../problems/helpers/problemView.js';

/** The full practice item the client reconciles its optimistic state with (`problem` null if gone). */
export const toPracticeItem = (doc, problem = null) => ({
  id: String(doc._id),
  problemId: doc.problemId,
  status: doc.status,
  addedFrom: doc.addedFrom,
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt,
  problem: problem ? toProblemSummary(problem) : null,
});
