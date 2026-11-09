import { describe, expect, it } from 'vitest';
import {
  sanitizeCoachResponse, sanitizeRating, sanitizeTags,
} from '../../../../src/modules/llm/schema/sanitizeCoachResponse.js';

const base = {
  tags: [], estimatedRating: 1000, hints: ['h'], approach: 'a',
  solutionSteps: [], complexity: '', code: '', pitfalls: [],
};

describe('sanitizeTags', () => {
  it('keeps official topic tags only (case/space fixed, deduplicated)', () => {
    expect(sanitizeTags([' DP ', 'dp', 'Bitmasks', 'segment tree', '*special', 'math'])).toEqual(['dp', 'bitmasks', 'math']);
  });

  it('keeps at most 8 tags', () => {
    const many = ['dp', 'math', 'greedy', 'graphs', 'trees', 'dsu', 'games', 'fft', 'flows', 'hashing'];
    expect(sanitizeTags(many)).toEqual(many.slice(0, 8));
  });
});

describe('sanitizeRating', () => {
  it.each([
    [1234, 1200], [1250, 1300], [799, 800], [100, 800], [3549, 3500], [9000, 3500], ['1650', 1700],
  ])('%s → %s', (input, expected) => {
    expect(sanitizeRating(input)).toBe(expected);
  });

  it.each([null, undefined, '', 'hard', Number.NaN, Number.POSITIVE_INFINITY])('%s → null', (input) => {
    expect(sanitizeRating(input)).toBeNull();
  });
});

describe('sanitizeCoachResponse', () => {
  it('limits array lengths and drops blank items', () => {
    const answer = sanitizeCoachResponse({
      ...base,
      hints: ['1', ' ', '2', '3', '4'],
      solutionSteps: Array.from({ length: 20 }, (_, i) => `s${i}`),
      pitfalls: Array.from({ length: 10 }, (_, i) => `p${i}`),
    });
    expect(answer.hints).toEqual(['1', '2', '3']);
    expect(answer.solutionSteps).toHaveLength(12);
    expect(answer.pitfalls).toHaveLength(8);
  });

  it('trims and caps string lengths', () => {
    const answer = sanitizeCoachResponse({
      ...base,
      approach: `  ${'a'.repeat(5000)}`,
      complexity: ' O(n) ',
      code: `\n${'c'.repeat(25_000)}`,
      hints: ['x'.repeat(900)],
    });
    expect(answer.approach).toHaveLength(4000);
    expect(answer.complexity).toBe('O(n)');
    expect(answer.code).toHaveLength(20_000);
    expect(answer.hints[0]).toHaveLength(500);
  });

  it('keeps indentation inside code', () => {
    expect(sanitizeCoachResponse({ ...base, code: 'int main() {\n  return 0;\n}\n' }).code)
      .toBe('int main() {\n  return 0;\n}');
  });
});
