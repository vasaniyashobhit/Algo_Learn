import { describe, expect, it } from 'vitest';
import { fallbackHints, firstParagraph } from '../../../../src/modules/stuck/helpers/fallbackHints.js';

const weak = { topicKey: 'bitmasks', kind: 'single', message: 'Your bitmasks strength is low (0.30).' };
const pair = { topicKey: 'bitmasks+dp', kind: 'pair', message: 'You have not practised bitmasks + dp yet.' };

describe('firstParagraph', () => {
  it('returns the first non-empty paragraph, capped at 500 chars', () => {
    expect(firstParagraph('\n\n  First idea.\nStill first. \n\nSecond.')).toBe('First idea.\nStill first.');
    expect(firstParagraph('x'.repeat(600))).toHaveLength(500);
    expect(firstParagraph('x'.repeat(600)).endsWith('…')).toBe(true);
    expect(firstParagraph('  ')).toBeNull();
    expect(firstParagraph(null)).toBeNull();
  });
});

describe('fallbackHints', () => {
  it('uses the topics, the weakest single gap topic and the editorial', () => {
    expect(fallbackHints({ tags: ['bitmasks', 'dp'], gapItems: [pair, weak], editorial: 'Use a mask.\n\nMore.' })).toEqual([
      'This problem most likely uses bitmasks, dp.',
      'Review bitmasks first. Your bitmasks strength is low (0.30).',
      'From the editorial: Use a mask.',
    ]);
  });

  it('skips what is unknown', () => {
    expect(fallbackHints({ tags: ['dp'], gapItems: [pair] })).toEqual(['This problem most likely uses dp.']);
  });

  it('is never empty', () => {
    expect(fallbackHints({})).toEqual([expect.stringMatching(/constraints/)]);
  });
});
