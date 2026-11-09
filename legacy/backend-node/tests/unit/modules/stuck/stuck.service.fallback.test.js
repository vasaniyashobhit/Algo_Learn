import { describe, expect, it } from 'vitest';
import { STUCK_FALLBACK_NOTICE } from '../../../../src/config/constants.js';
import { USER_ID, dbProblem, fakeRepo, stuckService } from '../../../helpers/stuckService.js';

const gymUrl = 'https://codeforces.com/gym/104114/problem/B';
const fallback = (reason) => ({ answer: null, source: 'fallback', reason });

describe('stuck solve() — fallback (never blank)', () => {
  it('builds hints from the gap and the editorial when the AI is unavailable', async () => {
    const repo = fakeRepo({ problems: [dbProblem({ tags: ['math', 'bitmasks'] })], stats: [{ topicKey: 'bitmasks', strength: 0.25 }] });
    const { service } = stuckService({ resolved: { problemId: '1/A', rawInput: 'u' }, coach: fallback('AI_TIMEOUT'), repo });
    const result = await service.solve({ userId: USER_ID, inputType: 'url', payload: {} });
    expect(result).toMatchObject({
      source: 'fallback', notice: STUCK_FALLBACK_NOTICE, fallbackReason: 'AI_TIMEOUT',
      hasSolution: false, editorialAvailable: true,
    });
    expect(result.hints).toEqual([
      'This problem most likely uses math, bitmasks.',
      'Review bitmasks first. Your bitmasks strength is low (0.25).',
      'From the editorial: Ceil both sides.',
    ]);
    expect(result.gap.message).toBe('This problem needs bitmasks + math. Your bitmasks strength is low (0.25).');
    expect(result.similar.items).toHaveLength(1);
    expect(repo.saveQuery.mock.calls[0][0]).toMatchObject({ source: 'fallback', solution: null });
  });

  it('still answers for a gym link we do not have (no text, no tags)', async () => {
    const repo = fakeRepo({ userRating: null });
    const { service, getCoachAnswer, findSimilar } = stuckService({
      resolved: { problemId: '104114/B', rawInput: gymUrl }, coach: fallback('NO_INPUT'), repo,
    });
    const result = await service.solve({ userId: USER_ID, inputType: 'url', payload: { url: gymUrl } });
    expect(getCoachAnswer).toHaveBeenCalledWith(expect.objectContaining({ problemId: '104114/B', text: '', knownTags: [] }));
    expect(repo.searchProblems).not.toHaveBeenCalled();
    expect(repo.topicStats).not.toHaveBeenCalled();
    expect(result.problem).toEqual({
      matchedProblemId: null, requestedProblemId: '104114/B', title: null, tags: [], tagsSource: null, rating: null,
    });
    expect(result.gap).toEqual({ message: 'We could not detect the topics of this problem.', items: [], topics: [] });
    expect(result.hints).toEqual([expect.stringMatching(/constraints/)]);
    expect(findSimilar).toHaveBeenCalledWith(expect.objectContaining({ tags: [], rating: null, userRating: null, excludeIds: [] }));
    expect(result.similar.items).toHaveLength(1);
    expect(repo.saveQuery.mock.calls[0][0].tagsSource).toBeUndefined();
  });

  it('targets below the user rating on gap topics when the problem rating is unknown', async () => {
    const repo = fakeRepo({ search: [dbProblem({ _id: '3/C', title: 'N', description: '', tags: ['dp'], rating: null })], userRating: 1500 });
    const text = 'Some long statement about subsequences and their sums, with n up to 2e5.';
    const { service, findSimilar } = stuckService({ resolved: { text, rawInput: text }, repo });
    await service.solve({ userId: USER_ID, inputType: 'text', payload: { text } });
    expect(findSimilar).toHaveBeenCalledWith(expect.objectContaining({ tags: ['dp'], rating: 1350, userRating: 1500 }));
  });

  it('lets input errors propagate (nothing is saved)', async () => {
    const repo = fakeRepo();
    const { service, resolveInput } = stuckService({ repo });
    resolveInput.mockRejectedValueOnce(Object.assign(new Error('short'), { code: 'PROBLEM_TEXT_TOO_SHORT' }));
    await expect(service.solve({ userId: USER_ID, inputType: 'text', payload: { text: 'x' } }))
      .rejects.toMatchObject({ code: 'PROBLEM_TEXT_TOO_SHORT' });
    expect(repo.saveQuery).not.toHaveBeenCalled();
  });
});
