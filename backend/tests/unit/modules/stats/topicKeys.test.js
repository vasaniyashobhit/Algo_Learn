import { describe, expect, it } from 'vitest';
import { topicKeysFor } from '../../../../src/modules/stats/helpers/topicKeys.js';

const keys = (tags) => topicKeysFor(tags).map(({ topicKey }) => topicKey);

describe('topicKeysFor', () => {
  it('returns sorted singles then sorted pairs', () => {
    expect(topicKeysFor(['dp', 'bitmasks'])).toEqual([
      { topicKey: 'bitmasks', kind: 'single' },
      { topicKey: 'dp', kind: 'single' },
      { topicKey: 'bitmasks+dp', kind: 'pair' },
    ]);
  });

  it('builds every pair of three tags', () => {
    expect(keys(['math', 'dp', 'greedy'])).toEqual(['dp', 'greedy', 'math', 'dp+greedy', 'dp+math', 'greedy+math']);
  });

  it('excludes "*special" and unknown tags', () => {
    expect(keys(['*special', 'dp'])).toEqual(['dp']);
    expect(keys(['*special'])).toEqual([]);
    expect(keys(['dp', 'quantum'])).toEqual(['dp']);
  });

  it('removes duplicate tags and handles no tags', () => {
    expect(keys(['dp', 'dp'])).toEqual(['dp']);
    expect(keys([])).toEqual([]);
    expect(keys()).toEqual([]);
  });
});
