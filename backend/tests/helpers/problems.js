import { Problem } from '../../src/modules/problems/problem.model.js';
import { makeProblem } from './factories.js';

/** A problem with a fixed id like "10/A" (contestId and index derived from it). */
export const problemAt = (id, overrides = {}) => {
  const [contestId, index] = id.split('/');
  return makeProblem({ _id: id, contestId: Number(contestId), index, title: `Title ${id}`, ...overrides });
};

/** Inserts through Mongoose (validators + derived fields run). */
export const seedProblems = (docs) => Problem.insertMany(docs);

/**
 * Inserts a raw cf_api-style row like `bulkWrite` does: no defaults, so no description,
 * editorial, tagCount or hasEditorial fields.
 */
export const insertCfApiStub = (id, { tags = [], rating = null, title = `Stub ${id}` } = {}) => {
  const [contestId, index] = id.split('/');
  return Problem.collection.insertOne({
    _id: id, contestId: Number(contestId), index, title, tags, rating, source: 'cf_api',
  });
};

export const ids = (items) => items.map((item) => item.id);
