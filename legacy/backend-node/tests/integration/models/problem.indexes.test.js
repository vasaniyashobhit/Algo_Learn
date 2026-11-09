import { describe, expect, it } from 'vitest';
import mongoose from 'mongoose';
import { Problem } from '../../../src/modules/problems/problem.model.js';
import { useTestDB } from '../../helpers/db.js';
import { makeProblem } from '../../helpers/factories.js';
import { indexesByName } from '../../helpers/assertions.js';

useTestDB();

const DP_MID_RATED = { tags: 'dp', rating: mongoose.trusted({ $gte: 1200, $lte: 1800 }) };

describe('Problem indexes', () => {
  it('has tags, rating, tags+rating and a weighted text index', async () => {
    const indexes = await indexesByName(Problem);
    expect(indexes.tags_1.key).toEqual({ tags: 1 });
    expect(indexes.rating_1.key).toEqual({ rating: 1 });
    expect(indexes.tags_1_rating_1.key).toEqual({ tags: 1, rating: 1 });
    expect(indexes.problem_text.weights).toEqual({ title: 3, description: 1 });
  });

  it('ranks a title match above a description-only match in $text search', async () => {
    await Problem.create([
      makeProblem({ title: 'Fence', description: 'Use a segment tree for painting.' }),
      makeProblem({ title: 'Segment painting', description: 'Paint the fence.' }),
    ]);
    const results = await Problem.find(
      { $text: mongoose.trusted({ $search: 'segment' }) },
      { score: { $meta: 'textScore' } },
    )
      .sort({ score: { $meta: 'textScore' } })
      .lean();
    expect(results.map(({ title }) => title)).toEqual(['Segment painting', 'Fence']);
  });

  it('finds problems by tag and rating range using an index scan', async () => {
    await Problem.create([
      makeProblem({ tags: ['dp'], rating: 1500 }),
      makeProblem({ tags: ['dp'], rating: 2500 }),
      makeProblem({ tags: ['math'], rating: 1500 }),
    ]);
    const found = await Problem.find(DP_MID_RATED).lean();
    const explain = await Problem.find(DP_MID_RATED).explain();
    expect(found).toHaveLength(1);
    expect(JSON.stringify(explain)).toContain('IXSCAN');
  });
});

describe('sanitizeFilter on problem queries', () => {
  it('neutralizes untrusted operators coming from user input', async () => {
    await Problem.create(makeProblem({ rating: 1500 }));
    const userInput = { $gte: 0 };
    await expect(Problem.find({ rating: userInput }).lean()).rejects.toThrow(/Cast to Number/);
  });

  it('refuses an untrusted $text filter', async () => {
    await expect(Problem.find({ $text: { $search: 'x' } }).lean()).rejects.toThrow(/not allowed with sanitizeFilter/);
  });
});
