import { describe, expect, it } from 'vitest';
import { useTestDB } from '../../../helpers/db.js';
import { ids, insertCfApiStub, problemAt, seedProblems } from '../../../helpers/problems.js';
import { findSimilarToProblem, getById, problemId } from '../../../../src/modules/problems/problems.service.js';

useTestDB();

const expectProblemNotFound = async (promise) => {
  await expect(promise).rejects.toMatchObject({ statusCode: 404, code: 'PROBLEM_NOT_FOUND' });
};

describe('problems.service getById', () => {
  it('returns the full problem text', async () => {
    await seedProblems([problemAt('1950/F2', { description: 'Statement', note: 'Note', editorial: 'Hint' })]);
    expect(await getById('1950', 'F2')).toMatchObject({
      id: '1950/F2', contestId: 1950, index: 'F2', description: 'Statement', note: 'Note',
      editorial: 'Hint', hasEditorial: true, hasStatement: true,
    });
  });

  it('handles a cf_api row with no statement', async () => {
    await insertCfApiStub('2001/A', { tags: ['dp'], rating: 1500 });
    expect(await getById('2001', 'A')).toMatchObject({
      source: 'cf_api', description: '', editorial: '', hasStatement: false, rating: 1500,
    });
  });

  it('throws PROBLEM_NOT_FOUND for an unknown id', async () => {
    await expectProblemNotFound(getById('1', 'Z'));
  });

  it('builds ids as contestId/index', () => {
    expect(problemId('1723', 'GP1')).toBe('1723/GP1');
  });
});

describe('problems.service findSimilarToProblem', () => {
  it('excludes the problem itself and exact title duplicates', async () => {
    await seedProblems([
      problemAt('1/A', { title: 'Same', tags: ['dp'], rating: 1500 }),
      problemAt('2/A', { title: 'Same', tags: ['dp'], rating: 1500 }),
      problemAt('3/A', { title: 'Same!', tags: ['dp'], rating: 1500 }),
    ]);
    const { items, meta } = await findSimilarToProblem('1/A');
    expect(ids(items)).toEqual(['3/A']);
    expect(meta).toMatchObject({
      strategy: 'primary',
      problem: { id: '1/A', title: 'Same', rating: 1500, tags: ['dp'] },
    });
  });

  it('passes k and ratingWindow through', async () => {
    await seedProblems([
      problemAt('1/A', { tags: ['dp'], rating: 1500 }),
      problemAt('2/A', { tags: ['dp'], rating: 1550 }),
      problemAt('3/A', { tags: ['dp'], rating: 1590 }),
    ]);
    const { items, meta } = await findSimilarToProblem('1/A', { k: 1, ratingWindow: 50 });
    expect(ids(items)).toEqual(['2/A']);
    expect(meta).toMatchObject({ ratingWindow: 50, count: 1 });
  });

  it('works for an untagged, unrated cf_api source', async () => {
    await insertCfApiStub('9/A');
    await seedProblems([problemAt('1/A', { rating: 1250 })]);
    const { items, meta } = await findSimilarToProblem('9/A');
    expect(ids(items)).toEqual(['1/A']);
    expect(meta).toMatchObject({ strategy: 'near_user_rating', problem: { rating: null, tags: [] } });
  });

  it('throws PROBLEM_NOT_FOUND for an unknown source', async () => {
    await expectProblemNotFound(findSimilarToProblem('1/A'));
  });
});
