import { describe, expect, it } from 'vitest';
import {
  createSolvedMatcher, isSameOrCopy, normalizeTitle,
} from '../../../../src/modules/recommendations/helpers/solvedCopies.js';

const p = (id, title) => ({ id, title, contestId: Number(id.split('/')[0]) });

describe('normalizeTitle', () => {
  it('trims, collapses spaces and lower-cases', () => {
    expect(normalizeTitle('  Two   Arrays ')).toBe('two arrays');
    expect(normalizeTitle(null)).toBe('');
  });
});

describe('isSameOrCopy', () => {
  it('matches the same id', () => {
    expect(isSameOrCopy(p('5/A', 'X'), p('5/A', 'Y'))).toBe(true);
  });

  it('matches the same title (case-insensitive) up to 2 contests apart', () => {
    expect(isSameOrCopy(p('1900/C', 'Game On'), p('1901/A', 'game on'))).toBe(true);
    expect(isSameOrCopy(p('1900/C', 'Game On'), p('1902/A', 'GAME ON'))).toBe(true);
    expect(isSameOrCopy(p('1902/A', 'Game On'), p('1900/C', 'Game On'))).toBe(true);
  });

  it('does not match 3 contests apart, other titles or empty titles', () => {
    expect(isSameOrCopy(p('1900/C', 'Game On'), p('1903/A', 'Game On'))).toBe(false);
    expect(isSameOrCopy(p('1900/C', 'Game On'), p('1901/A', 'Game Off'))).toBe(false);
    expect(isSameOrCopy(p('1900/C', ''), p('1901/A', ''))).toBe(false);
  });
});

describe('createSolvedMatcher', () => {
  const isSolved = createSolvedMatcher([p('1900/C', 'Game On'), { id: '77/B', title: null, contestId: null }]);

  it('matches solved ids, including ones without a known title', () => {
    expect(isSolved(p('1900/C', 'whatever'))).toBe(true);
    expect(isSolved(p('77/B', 'Unknown'))).toBe(true);
  });

  it('matches Div1/Div2 copies of solved problems', () => {
    expect(isSolved(p('1901/A', 'GAME ON'))).toBe(true);
    expect(isSolved(p('1898/E', 'game on'))).toBe(true);
  });

  it('rejects unrelated problems and far-away titles', () => {
    expect(isSolved(p('1901/B', 'Other'))).toBe(false);
    expect(isSolved(p('1950/A', 'Game On'))).toBe(false);
  });

  it('matches nothing for an empty history', () => {
    expect(createSolvedMatcher([])(p('1/A', 'A'))).toBe(false);
  });
});
