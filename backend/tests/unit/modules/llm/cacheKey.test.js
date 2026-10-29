import { describe, expect, it } from 'vitest';
import { coachCacheKey, normalizeProblemText } from '../../../../src/modules/llm/helpers/cacheKey.js';
import { sha256Hex } from '../../../../src/lib/hash.js';

describe('coach cache key', () => {
  it('uses the problem id when known', () => {
    expect(coachCacheKey({ problemId: '1/A', text: 'whatever' })).toBe('problem:1/A');
  });

  it('hashes the normalized text otherwise', () => {
    expect(coachCacheKey({ text: '  a\r\n\tb  ' })).toBe(`text:${sha256Hex('a b')}`);
    expect(coachCacheKey({ text: 'a b' })).toBe(coachCacheKey({ text: 'a\n\n  b\n' }));
    expect(coachCacheKey({ text: 'A b' })).not.toBe(coachCacheKey({ text: 'a b' }));
  });

  it('is null without input', () => {
    expect(coachCacheKey({ text: ' \n ' })).toBeNull();
    expect(coachCacheKey()).toBeNull();
  });

  it('normalizes unicode compatibility forms and whitespace', () => {
    expect(normalizeProblemText('ｎ ≤ 10')).toBe('n ≤ 10');
    expect(normalizeProblemText(null)).toBe('');
  });
});
