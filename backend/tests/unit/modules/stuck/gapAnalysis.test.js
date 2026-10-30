import { describe, expect, it } from 'vitest';
import { analyzeGap, gapStatus, topicLabel } from '../../../../src/modules/stuck/helpers/gapAnalysis.js';

const stat = (topicKey, strength, attempted = 4) => ({ topicKey, strength, attempted });

describe('gapStatus', () => {
  it.each([
    [null, 'unseen'], [undefined, 'unseen'], [0, 'weak'], [0.39, 'weak'], [0.4, 'developing'],
    [0.7, 'developing'], [0.71, 'strong'], [1, 'strong'],
  ])('%s → %s', (strength, status) => {
    expect(gapStatus(strength)).toBe(status);
  });
});

describe('analyzeGap', () => {
  it('rates every single and pair key and sorts the gap weakest first', () => {
    const gap = analyzeGap({
      tags: ['dp', 'bitmasks', '*special'],
      stats: [stat('dp', 0.8), stat('bitmasks', 0.3)],
    });
    expect(gap.topics.map(({ topicKey, status }) => `${topicKey}:${status}`))
      .toEqual(['bitmasks:weak', 'bitmasks+dp:unseen', 'dp:strong']);
    expect(gap.items.map(({ topicKey }) => topicKey)).toEqual(['bitmasks', 'bitmasks+dp']);
    expect(gap.items[0]).toEqual({
      topicKey: 'bitmasks', kind: 'single', strength: 0.3, status: 'weak', attempted: 4,
      message: 'Your bitmasks strength is low (0.30).',
    });
    expect(gap.message).toBe('This problem needs bitmasks + dp. Your bitmasks strength is low (0.30).');
  });

  it('orders weak before unseen, then strength, then singles before pairs', () => {
    const gap = analyzeGap({ tags: ['dp', 'graphs', 'math'], stats: [stat('math', 0.35), stat('dp', 0.1)] });
    expect(gap.items.map(({ topicKey }) => topicKey))
      .toEqual(['dp', 'math', 'graphs', 'dp+graphs', 'dp+math', 'graphs+math']);
  });

  it('marks every topic unseen for a user without stats, rounding nothing', () => {
    const gap = analyzeGap({ tags: ['greedy'] });
    expect(gap.items).toEqual([expect.objectContaining({
      topicKey: 'greedy', strength: null, status: 'unseen', attempted: 0, message: 'You have not practised greedy yet.',
    })]);
  });

  it('says the user looks ready when there is no gap, and rounds to 2 decimals', () => {
    const gap = analyzeGap({ tags: ['math'], stats: [stat('math', 0.5555)] });
    expect(gap.items).toEqual([]);
    expect(gap.topics[0]).toMatchObject({ strength: 0.56, status: 'developing', message: 'Your math is developing (0.56).' });
    expect(gap.message).toBe('This problem needs math. You look ready for every topic in it.');
  });

  it('describes strong topics and handles a problem without tags', () => {
    expect(analyzeGap({ tags: ['math'], stats: [stat('math', 0.9)] }).topics[0].message).toBe('You are strong at math (0.90).');
    expect(analyzeGap({ tags: [] })).toEqual({ message: 'We could not detect the topics of this problem.', items: [], topics: [] });
  });

  it('labels pairs with spaces', () => {
    expect(topicLabel('bitmasks+dp')).toBe('bitmasks + dp');
  });
});
