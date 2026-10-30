import { describe, expect, it } from 'vitest';
import { toMarkdownMath } from './latex.js';

describe('toMarkdownMath', () => {
  it('turns Codeforces inline maths $$$x$$$ into $x$', () => {
    expect(toMarkdownMath('Given $$$n$$$ tiles and $$$1 \\le k \\le n$$$.')).toBe('Given $n$ tiles and $1 \\le k \\le n$.');
  });

  it('turns display maths $$$$$$x$$$$$$ into a $$ block on its own lines', () => {
    expect(toMarkdownMath('Sum: $$$$$$\\sum a_i$$$$$$ done')).toBe('Sum: \n\n$$\n\\sum a_i\n$$\n\n done');
  });

  it('handles maths spanning lines and leaves other dollars alone', () => {
    expect(toMarkdownMath('$$$a\n+b$$$ costs $5')).toBe('$a\n+b$ costs $5');
  });

  it('accepts empty and missing text', () => {
    expect(toMarkdownMath('')).toBe('');
    expect(toMarkdownMath(null)).toBe('');
    expect(toMarkdownMath(undefined)).toBe('');
  });
});
