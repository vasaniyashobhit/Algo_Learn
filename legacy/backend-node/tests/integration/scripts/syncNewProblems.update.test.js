import { describe, expect, it, vi } from 'vitest';
import { Problem } from '../../../src/modules/problems/problem.model.js';
import { syncNewProblems } from '../../../src/scripts/import/syncNewProblems.js';
import { useTestDB } from '../../helpers/db.js';
import { makeProblem } from '../../helpers/factories.js';
import { insertCfApiStub } from '../../helpers/problems.js';

useTestDB();

const cfProblem = (contestId, index, overrides = {}) =>
  ({ contestId, index, name: `CF ${contestId}${index}`, rating: 1600, tags: ['greedy'], ...overrides });

const fakeClient = (problems) => ({ problemsetProblems: vi.fn(async () => ({ problems })) });

describe('syncNewProblems — updates to cf_api rows', () => {
  it('updates rating and tags of cf_api rows that changed on Codeforces', async () => {
    await syncNewProblems({ client: fakeClient([cfProblem(2100, 'A', { rating: undefined, tags: [] })]) });
    const summary = await syncNewProblems({
      client: fakeClient([cfProblem(2100, 'A', { rating: 1900, tags: ['dp', 'math'], name: 'Renamed' })]),
    });
    expect(summary).toMatchObject({ inserted: 0, alreadyPresent: 1, updated: 1 });
    expect(await Problem.findById('2100/A').lean()).toMatchObject({
      rating: 1900, tags: ['dp', 'math'], tagCount: 2, title: 'CF 2100A', source: 'cf_api',
    });
  });

  it('reports 0 updated and keeps updatedAt when nothing changed (tag order ignored)', async () => {
    await syncNewProblems({ client: fakeClient([cfProblem(2101, 'A', { tags: ['dp', 'math'] })]) });
    const before = await Problem.findById('2101/A').lean();
    const summary = await syncNewProblems({ client: fakeClient([cfProblem(2101, 'A', { tags: ['math', 'dp'] })]) });
    expect(summary.updated).toBe(0);
    expect((await Problem.findById('2101/A').lean()).updatedAt).toEqual(before.updatedAt);
  });

  it('never touches hf rows or any text field', async () => {
    await Problem.create(makeProblem({ _id: '1/A', contestId: 1, title: 'Original', rating: 1000, editorial: 'Keep' }));
    const summary = await syncNewProblems({ client: fakeClient([cfProblem(1, 'A', { rating: 2500, tags: ['dp'] })]) });
    expect(summary.updated).toBe(0);
    expect(await Problem.findById('1/A').lean()).toMatchObject({
      title: 'Original', rating: 1000, tags: ['dp', 'greedy'], editorial: 'Keep', source: 'hf',
    });
  });

  it('updates a bulkWrite-style stub without adding text fields', async () => {
    await insertCfApiStub('2102/B', { title: 'Stub', rating: 1200, tags: ['math'] });
    const summary = await syncNewProblems({ client: fakeClient([cfProblem(2102, 'B', { rating: 1300 })]) });
    expect(summary.updated).toBe(1);
    const row = await Problem.collection.findOne({ _id: '2102/B' });
    expect(row).toMatchObject({ rating: 1300, tags: ['greedy'], tagCount: 1, title: 'Stub' });
    expect(row).not.toHaveProperty('description');
  });

  it('leaves cf_api rows that Codeforces no longer lists alone', async () => {
    await syncNewProblems({ client: fakeClient([cfProblem(2103, 'A')]) });
    expect((await syncNewProblems({ client: fakeClient([]) })).updated).toBe(0);
    expect(await Problem.findById('2103/A').lean()).toMatchObject({ rating: 1600 });
  });
});
