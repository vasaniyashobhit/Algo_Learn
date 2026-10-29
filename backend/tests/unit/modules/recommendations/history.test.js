import { describe, expect, it } from 'vitest';
import { summarizeHistory } from '../../../../src/modules/recommendations/helpers/history.js';

const sub = (problemId, verdict, day, tags = ['dp']) =>
  ({ problemId, verdict, problemTags: tags, problemRating: 1500, submittedAt: new Date(Date.UTC(2026, 0, day)) });

describe('summarizeHistory', () => {
  it('splits solved ids from never-solved problems, newest failure first', () => {
    const { solvedIds, recentFailed } = summarizeHistory([
      sub('1/A', 'WRONG_ANSWER', 1), sub('1/A', 'OK', 2),
      sub('2/A', 'WRONG_ANSWER', 3, ['math']),
      sub('3/A', 'TIME_LIMIT_EXCEEDED', 5, ['graphs']), sub('3/A', 'WRONG_ANSWER', 6, ['graphs', 'trees']),
    ]);
    expect(solvedIds).toEqual(['1/A']);
    expect(recentFailed).toEqual([
      { problemId: '3/A', tags: ['graphs', 'trees'] },
      { problemId: '2/A', tags: ['math'] },
    ]);
  });

  it('keeps only the n most recent failures', () => {
    const subs = Array.from({ length: 12 }, (_, i) => sub(`${i + 1}/A`, 'WRONG_ANSWER', i + 1));
    const { recentFailed } = summarizeHistory(subs);
    expect(recentFailed).toHaveLength(10);
    expect(recentFailed[0].problemId).toBe('12/A');
    expect(summarizeHistory(subs, 2).recentFailed.map(({ problemId }) => problemId)).toEqual(['12/A', '11/A']);
  });

  it('is empty for no submissions', () => {
    expect(summarizeHistory([])).toEqual({ solvedIds: [], recentFailed: [] });
  });
});
