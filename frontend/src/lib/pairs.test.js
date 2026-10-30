import { describe, expect, it } from 'vitest';
import { pairStats, topicStat } from '../test/dashboardFixtures.js';
import { pairInsights } from './pairs.js';

const keys = (list) => list.map((pair) => pair.topicKey);

describe('pairInsights', () => {
  it('ignores pairs with fewer than 3 attempts and splits weak from strong', () => {
    const { weak, strong, eligible } = pairInsights(pairStats);
    expect(eligible).toBe(4);
    expect(keys(weak)).toEqual(['bitmasks+dp', 'dsu+graphs']);
    expect(keys(strong)).toEqual(['dp+math', 'greedy+math']);
  });

  it('never lists the same pair as weak and strong', () => {
    const many = Array.from({ length: 8 }, (_, i) => topicStat(`a${i}+b`, { strength: i / 10, attempted: 5 }));
    const { weak, strong } = pairInsights(many);
    expect(weak).toHaveLength(3);
    expect(strong).toHaveLength(3);
    expect(keys(strong)).toEqual(['a7+b', 'a6+b', 'a5+b']);
    expect(keys(weak).some((key) => keys(strong).includes(key))).toBe(false);
  });

  it('breaks strength ties by attempts, then name', () => {
    const tied = [
      topicStat('b+c', { strength: 0.3, attempted: 4 }),
      topicStat('a+c', { strength: 0.3, attempted: 4 }),
      topicStat('d+e', { strength: 0.3, attempted: 9 }),
    ];
    expect(keys(pairInsights(tied).weak)).toEqual(['d+e', 'a+c', 'b+c']);
    expect(pairInsights()).toEqual({ weak: [], strong: [], eligible: 0 });
  });
});
