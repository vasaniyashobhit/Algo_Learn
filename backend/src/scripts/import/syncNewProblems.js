import { Problem } from '../../modules/problems/problem.model.js';
import { fromCfProblem } from '../../modules/problems/helpers/fromCfProblem.js';
import { partitionValid } from '../../modules/problems/helpers/validateProblemDoc.js';
import { bulkUpsert } from './bulkUpsert.js';

/**
 * Adds problems from `problemset.problems` that are not in the DB yet (source "cf_api").
 * Uses `$setOnInsert`, so existing rows (including hf rows with statements) are never changed.
 */
export const syncNewProblems = async ({ client, model = Problem, batchSize, onBatch } = {}) => {
  const { problems = [] } = await client.problemsetProblems();
  const docs = problems.map(fromCfProblem);
  const { valid, rejected, rejectedIds } = partitionValid(docs);
  const unique = [...new Map(valid.map((doc) => [doc._id, doc])).values()];
  const totals = await bulkUpsert(model, unique, { operator: '$setOnInsert', batchSize, onBatch });
  return {
    fetched: problems.length,
    rejected: rejectedIds.length,
    rejectedByReason: rejected,
    rejectedIds: rejectedIds.slice(0, 20),
    inserted: totals.upserted,
    alreadyPresent: totals.matched,
  };
};
