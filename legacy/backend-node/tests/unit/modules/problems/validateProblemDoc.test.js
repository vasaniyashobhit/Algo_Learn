import { describe, expect, it } from 'vitest';
import { partitionValid, rejectReason } from '../../../../src/modules/problems/helpers/validateProblemDoc.js';

const doc = (overrides = {}) => ({ _id: '1/A', contestId: 1, index: 'A', title: 'T', tags: ['dp'], ...overrides });

describe('rejectReason', () => {
  it('accepts normal, multi-part and the 4 unusual dataset ids', () => {
    for (const [contestId, index] of [[1, 'A'], [1950, 'F2'], [1723, 'GP1'], [1723, 'GP2'], [921, '01'], [921, '02']]) {
      expect(rejectReason(doc({ _id: `${contestId}/${index}`, contestId, index }))).toBeNull();
    }
  });

  it('rejects bad ids', () => {
    expect(rejectReason(doc({ _id: '1A' }))).toBe('invalidId');
    expect(rejectReason(doc({ _id: '1/ABCD', index: 'ABCD' }))).toBe('invalidId');
    expect(rejectReason(doc({ _id: '1/a', index: 'a' }))).toBe('invalidId');
  });

  it('rejects bad contest ids, id mismatches, missing titles and unknown tags', () => {
    expect(rejectReason(doc({ contestId: null }))).toBe('invalidContestId');
    expect(rejectReason(doc({ contestId: 2 }))).toBe('idMismatch');
    expect(rejectReason(doc({ title: '' }))).toBe('missingTitle');
    expect(rejectReason(doc({ tags: ['dp', 'magic'] }))).toBe('unknownTag');
    expect(rejectReason(doc({ tags: ['*special'] }))).toBeNull();
  });
});

describe('partitionValid', () => {
  it('splits valid docs from rejected ones with counts per reason', () => {
    const result = partitionValid([doc(), doc({ _id: 'x' }), doc({ _id: 'y' }), doc({ title: '' })]);
    expect(result.valid).toHaveLength(1);
    expect(result.rejected).toEqual({ invalidId: 2, missingTitle: 1 });
    expect(result.rejectedIds).toEqual(['x', 'y', '1/A']);
  });
});
