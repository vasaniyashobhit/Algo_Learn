import { describe, expect, it } from 'vitest';
import { createLocator } from '../../../../src/modules/stuck/stuck.locate.js';
import { STATEMENT, coachAnswer } from '../../../helpers/stuck.js';
import { dbProblem, fakeRepo } from '../../../helpers/stuckService.js';

describe('stuck locator', () => {
  it('finds a problem by id without a text search', async () => {
    const repo = fakeRepo({ problems: [dbProblem()] });
    expect(await createLocator({ repo }).locate({ problemId: '1/A' })).toEqual({ match: dbProblem(), neighbors: null });
    expect(repo.searchProblems).not.toHaveBeenCalled();
  });

  it('searches the text when the id is unknown, and returns no match for no text', async () => {
    const repo = fakeRepo({ search: [dbProblem()] });
    const { locate } = createLocator({ repo });
    expect(await locate({ problemId: '999/Z', text: STATEMENT })).toEqual({ match: dbProblem(), neighbors: [dbProblem()] });
    expect(await locate({ problemId: '999/Z' })).toEqual({ match: null, neighbors: [] });
  });

  it('detects tags as db → ai → neighbors → none', async () => {
    const { detectTags } = createLocator({ repo: fakeRepo() });
    const answer = coachAnswer({ tags: ['dp'], estimatedRating: 1700 });
    expect(await detectTags({ match: dbProblem({ tags: ['*special', 'math'] }), answer }))
      .toEqual({ tags: ['math'], tagsSource: 'db', rating: 1000 });
    expect(await detectTags({ match: null, answer })).toEqual({ tags: ['dp'], tagsSource: 'ai', rating: 1700 });
    expect(await detectTags({ match: null, answer: null, neighbors: [dbProblem({ _id: '2/A', tags: ['greedy'] })] }))
      .toEqual({ tags: ['greedy'], tagsSource: 'neighbors', rating: 1000 });
    expect(await detectTags({ match: null, answer: null, text: '' })).toEqual({ tags: [], tagsSource: null, rating: null });
  });
});
