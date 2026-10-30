import { describe, expect, it } from 'vitest';
import { STATEMENT, coachAnswer } from '../../../helpers/stuck.js';
import { USER_ID, dbProblem, fakeRepo, stuckService } from '../../../helpers/stuckService.js';

const url = 'https://codeforces.com/contest/1/problem/A';

describe('stuck solve() — problem found in the DB (tagsSource db)', () => {
  it('uses the stored tags, rating and editorial for a Codeforces URL', async () => {
    const repo = fakeRepo({ problems: [dbProblem()], stats: [{ topicKey: 'math', strength: 0.2, attempted: 5 }] });
    const coach = { answer: coachAnswer({ tags: ['dp'] }), source: 'ai', provider: 'gemini', model: 'a' };
    const { service, getCoachAnswer, resolveInput, findSimilar } = stuckService({
      resolved: { problemId: '1/A', rawInput: url }, coach, repo,
    });
    const result = await service.solve({ userId: USER_ID, inputType: 'url', payload: { url } });

    expect(resolveInput).toHaveBeenCalledWith({ inputType: 'url', url, deadline: 51_000 });
    expect(getCoachAnswer).toHaveBeenCalledWith({
      problemId: '1/A', text: expect.stringContaining('Theatre Square in the capital'), knownTags: ['math'], deadline: 51_000,
    });
    expect(result.problem).toEqual({
      matchedProblemId: '1/A', requestedProblemId: '1/A', title: 'Theatre Square', tags: ['math'], tagsSource: 'db', rating: 1000,
    });
    expect(result).toMatchObject({ source: 'ai', notice: null, hasSolution: true, editorialAvailable: true, inputType: 'url' });
    expect(result.hints).toEqual(coach.answer.hints);
    expect(result.gap.items).toEqual([expect.objectContaining({ topicKey: 'math', status: 'weak', strength: 0.2 })]);
    expect(repo.topicStats).toHaveBeenCalledWith(USER_ID, ['math']);
    expect(repo.searchProblems).not.toHaveBeenCalled();
    expect(findSimilar).toHaveBeenCalledWith(expect.objectContaining({
      tags: ['math'], rating: 850, userRating: 1200, excludeIds: ['1/A'], excludeTitles: ['Theatre Square'], k: 10,
    }));
    expect(result.similar).toMatchObject({ easier: true, targetRating: 850, strategies: ['primary'] });
  });

  it('saves the query with the solution kept apart from the public result', async () => {
    const repo = fakeRepo({ problems: [dbProblem()] });
    const { service } = stuckService({ resolved: { problemId: '1/A', rawInput: url }, coach: { answer: coachAnswer(), source: 'cache' }, repo });
    const result = await service.solve({ userId: USER_ID, inputType: 'url', payload: { url } });
    const [saved] = repo.saveQuery.mock.calls[0];
    expect(saved).toMatchObject({
      userId: USER_ID, inputType: 'url', rawInput: url, matchedProblemId: '1/A', detectedTags: ['math'],
      tagsSource: 'db', estimatedRating: 1000, source: 'cache',
      gap: [{ topicKey: 'math', kind: 'single', strength: null, status: 'unseen' }],
      solution: expect.objectContaining({ approach: expect.any(String), code: 'int main() {}' }),
    });
    expect(saved.result).not.toHaveProperty('solution');
    expect(result).not.toHaveProperty('solution');
    expect(result.id).toMatch(/^[a-f0-9]{24}$/);
  });

  it('matches pasted text to a stored problem by its title', async () => {
    const problem = dbProblem({ tags: ['math', 'implementation'] });
    const repo = fakeRepo({ search: [dbProblem({ _id: '9/B', title: 'Other' }), problem] });
    const { service, getCoachAnswer } = stuckService({ resolved: { text: STATEMENT, rawInput: STATEMENT }, repo });
    const result = await service.solve({ userId: USER_ID, inputType: 'text', payload: { text: STATEMENT } });
    expect(repo.searchProblems).toHaveBeenCalledWith(expect.stringContaining('Theatre Square'), 5);
    expect(getCoachAnswer).toHaveBeenCalledWith(expect.objectContaining({ problemId: '1/A', text: STATEMENT }));
    expect(result.problem).toMatchObject({ matchedProblemId: '1/A', requestedProblemId: null, tagsSource: 'db' });
  });

  it('excludes problems the user already solved from the similar list', async () => {
    const repo = fakeRepo({ problems: [dbProblem()], solvedIds: ['4/A', '5/B'], stats: [{ topicKey: 'math', strength: 0.9 }] });
    const { service, findSimilar } = stuckService({ resolved: { problemId: '1/A', rawInput: url }, repo });
    const result = await service.solve({ userId: USER_ID, inputType: 'url', payload: { url } });
    expect(findSimilar).toHaveBeenCalledWith(expect.objectContaining({ excludeIds: ['1/A', '4/A', '5/B'], rating: 1000 }));
    expect(result.similar.easier).toBe(false);
  });
});
