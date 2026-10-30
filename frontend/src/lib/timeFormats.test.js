import { describe, expect, it } from 'vitest';
import { formatWhen, retryClock } from './formatters.js';
import { codeforcesUrl, problemPath, ratingFigure } from './problemLinks.js';
import { VERIFY_COPY, verifyWaitText } from './verifyCopy.js';

describe('time formats', () => {
  it('gives the local clock time a wait ends', () => {
    const now = new Date(2026, 9, 30, 1, 12, 0).getTime();
    expect(retryClock(3600, now)).toBe('02:12');
    expect(retryClock(-5, now)).toBe('01:12');
  });

  it('formats a history time as "30 Oct · 01:12" in local time', () => {
    expect(formatWhen(new Date(2026, 9, 30, 1, 12).toISOString())).toBe('30 Oct · 01:12');
    expect(formatWhen('not a date')).toBe('');
  });
});

describe('verify copy and problem links', () => {
  it('words the "I solved it" answers', () => {
    expect(VERIFY_COPY.NOT_SOLVED_YET).toMatch(/^We don't see an accepted submission yet/);
    expect(VERIFY_COPY.STILL_JUDGING).toBe('Codeforces is still judging your submission — try again in a minute.');
    expect(verifyWaitText(18)).toBe('Codeforces was checked moments ago. Try again in 18 seconds.');
  });

  it('links our problem page and shows a dash for an unrated figure', () => {
    expect(problemPath('1811/G2')).toBe('/problems/1811/G2');
    expect(codeforcesUrl({ contestId: 1811, index: 'G2' })).toMatch(/1811\/G2$/);
    expect(ratingFigure(2200)).toBe('2200');
    expect(ratingFigure(null)).toBe('–');
  });
});
