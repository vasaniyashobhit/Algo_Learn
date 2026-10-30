import { describe, expect, it } from 'vitest';
import { historyLabel, isHistoryKey, withoutIds } from './historyCache.js';
import { hintsCaption, isBroader, solutionButtonLabel, stuckProblemId, stuckTitle } from './stuckLabels.js';

describe('stuck labels', () => {
  it('says who wrote the hints', () => {
    expect(hintsCaption({ source: 'ai', model: 'gemini-3.5-flash-lite' })).toBe(
      'AI hints (gemini-3.5-flash-lite). They can be wrong: check each step.',
    );
    expect(hintsCaption({ source: 'cache', model: null })).toBe('AI hints. They can be wrong: check each step.');
    expect(hintsCaption({ source: 'fallback' })).toMatch(/No AI involved/);
  });

  it('names the solution button after what is stored', () => {
    expect(solutionButtonLabel({ hasSolution: true, editorialAvailable: true })).toBe('Show full solution');
    expect(solutionButtonLabel({ hasSolution: false, editorialAvailable: true })).toBe('Show editorial');
    expect(solutionButtonLabel({ hasSolution: false, editorialAvailable: false })).toBe('Show full solution');
  });

  it('picks the problem id and a title that is never blank', () => {
    expect(stuckProblemId({ matchedProblemId: '1/A', requestedProblemId: '2/B' })).toBe('1/A');
    expect(stuckProblemId({ matchedProblemId: null, requestedProblemId: '2/B' })).toBe('2/B');
    expect(stuckProblemId(null)).toBeNull();
    expect(stuckTitle({ title: '' })).toBe('Untitled problem');
    expect(stuckTitle({ title: 'Flowers' })).toBe('Flowers');
  });

  it('spots broader similar picks', () => {
    expect(isBroader(['primary'])).toBe(false);
    expect(isBroader(['primary', 'widened_window'])).toBe(true);
    expect(isBroader()).toBe(false);
  });
});

describe('history cache helpers', () => {
  const page = { data: [{ id: 'a' }, { id: 'b' }], meta: { total: 9, page: 1 } };

  it('removes ids and lowers the total by what was removed', () => {
    expect(withoutIds(page, new Set(['a']))).toEqual({ data: [{ id: 'b' }], meta: { total: 8, page: 1 } });
    expect(withoutIds(page, new Set(['zzz']))).toBe(page);
    expect(withoutIds(undefined, new Set(['a']))).toBeUndefined();
    expect(withoutIds({ data: [{ id: 'a' }], meta: {} }, new Set(['a'])).meta.total).toBe(0);
  });

  it('recognises history keys and labels an entry', () => {
    expect(isHistoryKey(['stuck', 'history', { page: 1 }])).toBe(true);
    expect(isHistoryKey(['stuck', 'detail', 'x'])).toBe(false);
    expect(historyLabel({ problem: { title: 'Flowers', matchedProblemId: '474/D' } })).toBe('Flowers (474/D)');
    expect(historyLabel({ problem: { title: '', requestedProblemId: null } })).toBe('Untitled problem');
  });
});
