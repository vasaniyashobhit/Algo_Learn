import { describe, expect, it } from 'vitest';
import {
  SPECIAL_TAG, cleanProblem, cleanTags, cleanText, hasSpecialTag, toNumberOrNull,
} from '../../../../src/modules/problems/helpers/cleanProblem.js';

const row = (overrides = {}) => ({
  id: '1950/F2',
  contest_id: '1950',
  index: 'F2',
  title: '  Theatre Square ',
  description: '  Given n and m.  ',
  input_format: ' n m ',
  output_format: 'One number',
  note: null,
  editorial: null,
  rating: 1000n,
  tags: ['math', 'dp'],
  ...overrides,
});

describe('cleanProblem helpers', () => {
  it('cleanText trims strings and turns non-strings into empty strings', () => {
    expect(cleanText('  a b  ')).toBe('a b');
    expect([null, undefined, 5].map(cleanText)).toEqual(['', '', '']);
  });

  it('toNumberOrNull converts BigInt, numbers and numeric strings; keeps missing as null', () => {
    expect(toNumberOrNull(3500n)).toBe(3500);
    expect(toNumberOrNull('1950')).toBe(1950);
    expect(toNumberOrNull(800)).toBe(800);
    expect([null, undefined, '', 'abc'].map(toNumberOrNull)).toEqual([null, null, null, null]);
  });

  it('cleanTags trims, drops empties and de-duplicates in order', () => {
    expect(cleanTags([' dp', 'math', 'dp', '', 'math'])).toEqual(['dp', 'math']);
    expect(cleanTags(null)).toEqual([]);
  });
});

describe('cleanProblem', () => {
  it('maps snake_case to camelCase, trims strings and sets source hf', () => {
    expect(cleanProblem(row())).toEqual({
      _id: '1950/F2',
      contestId: 1950,
      index: 'F2',
      title: 'Theatre Square',
      description: 'Given n and m.',
      inputFormat: 'n m',
      outputFormat: 'One number',
      note: '',
      editorial: '',
      rating: 1000,
      tags: ['math', 'dp'],
      tagCount: 2,
      hasEditorial: false,
      source: 'hf',
    });
  });

  it('skips empty or whitespace-only descriptions (returns null)', () => {
    expect(cleanProblem(row({ description: '' }))).toBeNull();
    expect(cleanProblem(row({ description: ' \n\t ' }))).toBeNull();
    expect(cleanProblem(row({ description: null }))).toBeNull();
    expect(cleanProblem(null)).toBeNull();
  });

  it('converts a BigInt rating to Number and keeps a null rating null', () => {
    expect(cleanProblem(row({ rating: 3500n })).rating).toBe(3500);
    expect(typeof cleanProblem(row()).rating).toBe('number');
    expect(cleanProblem(row({ rating: null })).rating).toBeNull();
  });

  it('dedupes tags and counts them; missing tags give an empty list', () => {
    expect(cleanProblem(row({ tags: ['dp', 'dp', 'greedy'] }))).toMatchObject({ tags: ['dp', 'greedy'], tagCount: 2 });
    expect(cleanProblem(row({ tags: null }))).toMatchObject({ tags: [], tagCount: 0 });
  });

  it('sets hasEditorial only for a non-blank editorial', () => {
    expect(cleanProblem(row({ editorial: ' Use prefix sums ' }))).toMatchObject({
      editorial: 'Use prefix sums',
      hasEditorial: true,
    });
    expect(cleanProblem(row({ editorial: '   ' })).hasEditorial).toBe(false);
  });

  it('keeps the *special tag in tags and flags it with hasSpecialTag', () => {
    const doc = cleanProblem(row({ tags: [SPECIAL_TAG, 'math'] }));
    expect(doc.tags).toEqual(['*special', 'math']);
    expect(hasSpecialTag(doc)).toBe(true);
    expect(hasSpecialTag(cleanProblem(row()))).toBe(false);
  });
});
