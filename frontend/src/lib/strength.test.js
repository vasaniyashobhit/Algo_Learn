import { describe, expect, it } from 'vitest';
import { formatStrength, LEVEL_LABELS, solvedText, strengthLevel, topicLabel } from './strength.js';

describe('strength helpers', () => {
  it('formats with two decimals and a dash when unknown', () => {
    expect(formatStrength(0.4167)).toBe('0.42');
    expect(formatStrength(0.5)).toBe('0.50');
    expect(formatStrength(undefined)).toBe('–');
  });

  it.each([
    [0.18, 'weak'],
    [0.39, 'weak'],
    [0.4, 'steady'],
    [0.64, 'steady'],
    [0.65, 'strong'],
  ])('%s is %s', (value, level) => expect(strengthLevel(value)).toBe(level));

  it('has a word for every level', () => {
    expect(LEVEL_LABELS).toEqual({ weak: 'Weak', steady: 'Steady', strong: 'Strong' });
  });

  it('spells pair keys as two topics and records as words', () => {
    expect(topicLabel('bitmasks+dp')).toBe('bitmasks + dp');
    expect(topicLabel('dp')).toBe('dp');
    expect(topicLabel()).toBe('');
    expect(solvedText({ solved: 4, attempted: 11 })).toBe('4 of 11 solved');
    expect(solvedText({})).toBe('0 of 0 solved');
  });
});
