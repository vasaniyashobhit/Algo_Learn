import { describe, expect, it } from 'vitest';
import { cn } from './cn.js';
import { formatWait } from './formatters.js';
import { formatStrength, SAMPLE_TOPICS } from './landingContent.js';
import { EASE, PRESS_SCALE, STAGGER } from './motionTokens.js';
import { queryKeys } from './queryKeys.js';

describe('formatWait', () => {
  it.each([
    [1, '1 second'],
    [45, '45 seconds'],
    [60, '1 minute'],
    [61, '2 minutes'],
    [900, '15 minutes'],
    [3600, '1 hour'],
    [7200, '2 hours'],
    [0, '1 second'],
    ['nope', '1 second'],
  ])('%s → %s', (seconds, text) => expect(formatWait(seconds)).toBe(text));
});

describe('small lib helpers', () => {
  it('cn joins truthy class names', () => expect(cn('a', false, null, 'b', undefined)).toBe('a b'));

  it('query keys are stable arrays', () => {
    expect(queryKeys.auth.me()).toEqual(['auth', 'me']);
    expect(queryKeys.meta.tags()).toEqual(['meta', 'tags']);
    expect(queryKeys.auth.me()[0]).toBe(queryKeys.auth.all[0]);
  });

  it('motion tokens match DESIGN.md', () => {
    expect(PRESS_SCALE).toBe(0.96);
    expect(STAGGER).toBe(0.045);
    expect(EASE).toEqual([0.7, 0, 0.2, 1]);
  });

  it('landing sample data formats strengths with two decimals', () => {
    expect(formatStrength(0.2)).toBe('0.20');
    expect(SAMPLE_TOPICS.filter((row) => row.weak)).toHaveLength(2);
  });
});
