import { describe, expect, it } from 'vitest';
import { pendingRefs } from '../../../../src/modules/sync/helpers/cfSubmissions.js';
import { cfSubmission } from '../../../helpers/codeforces.js';

describe('pendingRefs', () => {
  it('lists pending submissions to contest problems as { problemId, cfSubmissionId }', () => {
    const fetched = [
      cfSubmission(9, { verdict: 'TESTING', problem: { contestId: 5, index: 'B' } }),
      cfSubmission(8, { verdict: undefined, problem: { contestId: 6, index: 'C1' } }),
      cfSubmission(7, { verdict: 'OK' }),
      cfSubmission(6, { verdict: 'TESTING', problem: { index: 'A' } }),
    ];
    expect(pendingRefs(fetched)).toEqual([
      { problemId: '5/B', cfSubmissionId: 9 },
      { problemId: '6/C1', cfSubmissionId: 8 },
    ]);
  });

  it('is empty when everything is judged', () => {
    expect(pendingRefs([cfSubmission(1)])).toEqual([]);
  });
});
