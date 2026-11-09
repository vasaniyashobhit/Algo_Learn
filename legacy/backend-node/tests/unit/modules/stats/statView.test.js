import { describe, expect, it } from 'vitest';
import { toTopicStatView } from '../../../../src/modules/stats/helpers/statView.js';
import { emptyReason, withReason } from '../../../../src/modules/stats/helpers/emptyReason.js';

describe('toTopicStatView', () => {
  it('drops internal fields and lists the tags of a pair', () => {
    const at = new Date('2026-10-01T00:00:00Z');
    const view = toTopicStatView({
      _id: 'x', userId: 'u', topicKey: 'bitmasks+dp', kind: 'pair', attempted: 4, solved: 3, failed: 1,
      strength: 0.7, comfortRating: 1600, avgSolvedRating: 1500, maxSolvedRating: 1700, lastActivityAt: at,
      lastResults: [{ problemId: '1/A', solved: true, _id: 'internal' }],
    });
    expect(view).toEqual({
      topicKey: 'bitmasks+dp', kind: 'pair', tags: ['bitmasks', 'dp'], attempted: 4, solved: 3, failed: 1,
      strength: 0.7, comfortRating: 1600, avgSolvedRating: 1500, maxSolvedRating: 1700, lastActivityAt: at,
      lastResults: [{ problemId: '1/A', solved: true }],
    });
  });

  it('fills defaults for missing fields', () => {
    expect(toTopicStatView({ topicKey: 'dp', kind: 'single' })).toEqual({
      topicKey: 'dp', kind: 'single', tags: ['dp'], attempted: 0, solved: 0, failed: 0,
      strength: 0, comfortRating: null, avgSolvedRating: null, maxSolvedRating: null, lastActivityAt: null, lastResults: [],
    });
  });
});

describe('emptyReason / withReason', () => {
  it('is NO_HANDLE, NOT_SYNCED or nothing', () => {
    expect(emptyReason({})).toBe('NO_HANDLE');
    expect(emptyReason({ cfHandle: 'tourist', lastSyncedAt: null })).toBe('NOT_SYNCED');
    expect(emptyReason({ cfHandle: 'tourist', lastSyncedAt: new Date() })).toBeUndefined();
  });

  it('adds `reason` to meta only when there is one', () => {
    expect(withReason({ a: 1 }, {})).toEqual({ a: 1, reason: 'NO_HANDLE' });
    expect(withReason({ a: 1 }, { cfHandle: 'x', lastSyncedAt: new Date() })).toEqual({ a: 1 });
  });
});
