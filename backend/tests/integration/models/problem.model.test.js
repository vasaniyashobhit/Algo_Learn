import { describe, expect, it } from 'vitest';
import { Problem } from '../../../src/modules/problems/problem.model.js';
import { useTestDB } from '../../helpers/db.js';
import { makeProblem } from '../../helpers/factories.js';
import { expectDuplicateKey, invalidPaths } from '../../helpers/assertions.js';

useTestDB();

describe('Problem model', () => {
  it('stores in the problems collection with a string _id', async () => {
    const saved = await Problem.create(makeProblem({ _id: '1/A', contestId: 1 }));
    expect(Problem.collection.name).toBe('problems');
    expect(saved._id).toBe('1/A');
  });

  it('requires _id, contestId, index and title', () => {
    expect(invalidPaths(Problem, {}).toSorted()).toEqual(['_id', 'contestId', 'index', 'title']);
  });

  it('rejects malformed ids, unknown tags, bad sources and out-of-range ratings', () => {
    expect(invalidPaths(Problem, makeProblem({ _id: '1A' }))).toEqual(['_id']);
    expect(invalidPaths(Problem, makeProblem({ tags: ['dp', 'magic'] }))).toEqual(['tags.1']);
    expect(invalidPaths(Problem, makeProblem({ source: 'scraped' }))).toEqual(['source']);
    expect(invalidPaths(Problem, makeProblem({ rating: 9000 }))).toEqual(['rating']);
  });

  it('accepts multi-part indexes and *special', () => {
    expect(invalidPaths(Problem, makeProblem({ _id: '1950/F2', index: 'F2', tags: ['*special'] }))).toEqual([]);
  });

  it('applies defaults: null rating, empty texts and tags, source hf', async () => {
    const saved = await Problem.create({ _id: '2/B', contestId: 2, index: 'B', title: 'T' });
    expect(saved).toMatchObject({
      rating: null,
      description: '',
      editorial: '',
      tags: [],
      tagCount: 0,
      hasEditorial: false,
      source: 'hf',
    });
  });

  it('derives tagCount and hasEditorial before saving', async () => {
    const saved = await Problem.create(makeProblem({ tags: ['dp', 'math', 'greedy'], editorial: 'Idea' }));
    expect(saved.tagCount).toBe(3);
    expect(saved.hasEditorial).toBe(true);
  });

  it('rejects a duplicate _id with a 409 mapping', async () => {
    await Problem.create(makeProblem({ _id: '3/C', contestId: 3 }));
    await expectDuplicateKey(Problem.create(makeProblem({ _id: '3/C', contestId: 3 })), ['_id']);
  });

  it('toJSON removes __v and keeps _id', async () => {
    const json = (await Problem.create(makeProblem())).toJSON();
    expect(json).toHaveProperty('_id');
    expect(json).not.toHaveProperty('__v');
  });
});
