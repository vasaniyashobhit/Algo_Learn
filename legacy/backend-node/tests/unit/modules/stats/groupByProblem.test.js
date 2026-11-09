import { describe, expect, it } from 'vitest';
import { groupByProblem } from '../../../../src/modules/stats/helpers/groupByProblem.js';

const sub = (problemId, verdict, day, overrides = {}) => ({
  problemId,
  verdict,
  problemRating: 1400,
  problemTags: ['dp'],
  submittedAt: new Date(`2026-10-${String(day).padStart(2, '0')}T00:00:00Z`),
  ...overrides,
});

describe('groupByProblem', () => {
  it('returns one entry per problem with attempts, solved and the last time', () => {
    const result = groupByProblem([
      sub('1/A', 'WRONG_ANSWER', 1),
      sub('1/A', 'OK', 3),
      sub('1/A', 'TIME_LIMIT_EXCEEDED', 2),
      sub('2/B', 'WRONG_ANSWER', 5, { problemRating: null, problemTags: ['math'] }),
    ]);
    expect(result).toEqual([
      { problemId: '1/A', rating: 1400, tags: ['dp'], solved: true, attempts: 3, lastAt: new Date('2026-10-03T00:00:00Z') },
      { problemId: '2/B', rating: null, tags: ['math'], solved: false, attempts: 1, lastAt: new Date('2026-10-05T00:00:00Z') },
    ]);
  });

  it('stays solved after a later failed submission', () => {
    const [problem] = groupByProblem([sub('1/A', 'OK', 1), sub('1/A', 'WRONG_ANSWER', 2)]);
    expect(problem.solved).toBe(true);
  });

  it('takes rating and tags from the newest submission that has them', () => {
    const [problem] = groupByProblem([
      sub('1/A', 'WRONG_ANSWER', 4, { problemRating: null, problemTags: [] }),
      sub('1/A', 'WRONG_ANSWER', 2, { problemRating: 1600, problemTags: ['greedy'] }),
      sub('1/A', 'WRONG_ANSWER', 3, { problemRating: 1700, problemTags: ['dp', 'greedy'] }),
    ]);
    expect(problem).toMatchObject({ rating: 1700, tags: ['dp', 'greedy'], lastAt: new Date('2026-10-04T00:00:00Z') });
  });

  it('handles missing tags/rating and an empty list', () => {
    const [problem] = groupByProblem([{ problemId: '3/C', verdict: 'OK', submittedAt: '2026-10-01T00:00:00Z' }]);
    expect(problem).toMatchObject({ rating: null, tags: [], solved: true, attempts: 1 });
    expect(groupByProblem([])).toEqual([]);
  });
});
