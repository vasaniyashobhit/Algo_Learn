import { describe, expect, it } from 'vitest';
import { STUCK_FALLBACK_NOTICE } from '../../../../src/config/constants.js';
import { STATEMENT, coachAnswer } from '../../../helpers/stuck.js';
import { USER_ID, dbProblem, fakeRepo, stuckService } from '../../../helpers/stuckService.js';

const TEXT = 'You are given a tree with n vertices. Count the paths whose xor is zero, modulo 998244353.';
const input = { text: TEXT, rawInput: TEXT };
const solve = (deps) => stuckService(deps).service.solve({ userId: USER_ID, inputType: 'text', payload: { text: TEXT } });
const neighbor = (id, tags, rating) => dbProblem({ _id: id, title: `N ${id}`, description: '', tags, rating });

describe('stuck solve() — unknown problem', () => {
  it('uses the AI tags and rating (tagsSource ai)', async () => {
    const coach = { answer: coachAnswer({ tags: ['trees', 'bitmasks'], estimatedRating: 2100 }), source: 'ai' };
    const result = await solve({ resolved: input, coach, repo: fakeRepo({ search: [neighbor('7/C', ['dp'], 1500)] }) });
    expect(result.problem).toEqual({
      matchedProblemId: null, requestedProblemId: null, title: TEXT.slice(0, 120), tags: ['trees', 'bitmasks'],
      tagsSource: 'ai', rating: 2100,
    });
    expect(result).toMatchObject({ source: 'ai', notice: null, editorialAvailable: false });
  });

  it('falls back to the 5 nearest problems: most common tags, median rating (tagsSource neighbors)', async () => {
    const search = [
      neighbor('1/B', ['dp', 'trees'], 1800), neighbor('2/B', ['trees', 'dfs and similar'], 2000),
      neighbor('3/B', ['dp', 'trees'], null), neighbor('4/B', ['math'], 2400), neighbor('5/B', [], 1900),
    ];
    const repo = fakeRepo({ search });
    const result = await solve({ resolved: input, repo });
    expect(result.problem).toMatchObject({ tags: ['trees', 'dp'], tagsSource: 'neighbors', rating: 2000 });
    expect(result).toMatchObject({ source: 'fallback', notice: STUCK_FALLBACK_NOTICE, fallbackReason: 'AI_UNAVAILABLE' });
    expect(repo.searchProblems).toHaveBeenCalledTimes(1);
  });

  it('keeps the AI rating when the tags come from neighbors', async () => {
    const coach = { answer: coachAnswer({ tags: [], estimatedRating: 1300 }), source: 'ai' };
    const result = await solve({ resolved: input, coach, repo: fakeRepo({ search: [neighbor('1/B', ['dp'], 2500)] }) });
    expect(result.problem).toMatchObject({ tags: ['dp'], tagsSource: 'neighbors', rating: 1300 });
  });

  it('searches the neighbors after an id match without tags, excluding the problem itself', async () => {
    const stored = dbProblem({ tags: [], rating: null });
    const repo = fakeRepo({ problems: [stored], search: [stored, neighbor('8/A', ['greedy'], 1100)] });
    const result = await solve({ resolved: { problemId: '1/A', text: STATEMENT, rawInput: 'x' }, repo });
    expect(result.problem).toMatchObject({ matchedProblemId: '1/A', tags: ['greedy'], tagsSource: 'neighbors', rating: 1100 });
  });

  it('searches the stored statement when an id match has no tags and no text was given', async () => {
    const stored = dbProblem({ tags: [], rating: 1600 });
    const repo = fakeRepo({ problems: [stored], search: [neighbor('8/A', ['greedy'], 1100)] });
    const result = await solve({ resolved: { problemId: '1/A', rawInput: 'url' }, repo });
    expect(repo.searchProblems).toHaveBeenCalledWith(expect.stringContaining('Theatre Square'), 5);
    expect(result.problem).toMatchObject({ tagsSource: 'neighbors', rating: 1600 });
  });
});
