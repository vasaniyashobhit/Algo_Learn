import { describe, expect, it, vi } from 'vitest';
import { Problem } from '../../../src/modules/problems/problem.model.js';
import { syncNewProblems } from '../../../src/scripts/import/syncNewProblems.js';
import { useTestDB } from '../../helpers/db.js';
import { makeProblem } from '../../helpers/factories.js';

useTestDB();

const cfProblem = (contestId, index, overrides = {}) =>
  ({ contestId, index, name: `CF ${contestId}${index}`, type: 'PROGRAMMING', rating: 1600, tags: ['greedy'], ...overrides });

const fakeClient = (problems) => ({ problemsetProblems: vi.fn(async () => ({ problems, problemStatistics: [] })) });

describe('syncNewProblems', () => {
  it('inserts only problems that are not in the DB yet, as cf_api without description', async () => {
    const hf = makeProblem({ _id: '1/A', contestId: 1, title: 'Original', editorial: 'Keep me', rating: 1000 });
    await Problem.create(hf);
    const client = fakeClient([cfProblem(1, 'A', { name: 'Changed', rating: 2000 }), cfProblem(2100, 'B')]);
    const summary = await syncNewProblems({ client });
    expect(summary).toEqual({
      fetched: 2, rejected: 0, rejectedByReason: {}, rejectedIds: [], inserted: 1, alreadyPresent: 1,
    });
    const added = await Problem.findById('2100/B').lean();
    expect(added).toMatchObject({ source: 'cf_api', description: '', title: 'CF 2100B', rating: 1600, tagCount: 1 });
  });

  it('never overwrites the text, rating or source of hf rows', async () => {
    await Problem.create(makeProblem({ _id: '1/A', contestId: 1, title: 'Original', editorial: 'Keep me', rating: 1000 }));
    await syncNewProblems({ client: fakeClient([cfProblem(1, 'A', { name: 'Changed', rating: 2000, tags: [] })]) });
    expect(await Problem.findById('1/A').lean()).toMatchObject({
      title: 'Original', editorial: 'Keep me', rating: 1000, source: 'hf', tags: ['dp', 'greedy'],
    });
  });

  it('is idempotent across runs', async () => {
    const client = fakeClient([cfProblem(3, 'A'), cfProblem(3, 'B')]);
    expect((await syncNewProblems({ client })).inserted).toBe(2);
    expect(await syncNewProblems({ client })).toMatchObject({ inserted: 0, alreadyPresent: 2 });
  });

  it('rejects malformed problems and collapses duplicates in the API answer', async () => {
    const client = fakeClient([cfProblem(undefined, 'A'), cfProblem(4, 'A'), cfProblem(4, 'A'), cfProblem(5, 'lower')]);
    const summary = await syncNewProblems({ client });
    expect(summary).toMatchObject({ fetched: 4, rejected: 2, inserted: 1, rejectedIds: ['null/A', '5/lower'] });
    expect(summary.rejectedByReason).toEqual({ invalidId: 2 });
  });

  it('copes with an empty or missing problems list', async () => {
    expect((await syncNewProblems({ client: { problemsetProblems: async () => ({}) } })).fetched).toBe(0);
  });

  it('propagates client errors', async () => {
    const client = { problemsetProblems: async () => { throw new Error('CF down'); } };
    await expect(syncNewProblems({ client })).rejects.toThrow('CF down');
  });
});
