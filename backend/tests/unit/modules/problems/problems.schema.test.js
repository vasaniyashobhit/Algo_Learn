import { describe, expect, it } from 'vitest';
import {
  listQuerySchema, problemParamsSchema, similarQuerySchema,
} from '../../../../src/modules/problems/problems.schema.js';
import { TOPIC_TAGS } from '../../../../src/config/tags.js';

describe('listQuerySchema', () => {
  it('applies defaults to an empty query', () => {
    expect(listQuerySchema.parse({})).toEqual({ tags: [], matchAll: false, page: 1, limit: 20 });
  });

  it('accepts comma-separated and repeated tags, removing duplicates', () => {
    expect(listQuerySchema.parse({ tags: 'dp, greedy' }).tags).toEqual(['dp', 'greedy']);
    expect(listQuerySchema.parse({ tags: ['dp', 'math,dp'] }).tags).toEqual(['dp', 'math']);
    expect(listQuerySchema.parse({ tags: '*special' }).tags).toEqual(['*special']);
  });

  it('coerces numbers and booleans and treats blanks as missing', () => {
    expect(listQuerySchema.parse({ matchAll: 'true', minRating: '800', page: '3', limit: '', q: '' }))
      .toEqual({ tags: [], matchAll: true, minRating: 800, page: 3, limit: 20 });
  });

  it.each([
    [{ tags: 'nope' }],
    [{ tags: TOPIC_TAGS.slice(0, 11).join(',') }],
    [{ limit: '51' }],
    [{ page: '0' }],
    [{ minRating: '-1' }],
    [{ minRating: '1.5' }],
    [{ minRating: '1500', maxRating: '1000' }],
    [{ matchAll: 'maybe' }],
    [{ q: 'x'.repeat(101) }],
  ])('rejects %j', (query) => {
    expect(listQuerySchema.safeParse(query).success).toBe(false);
  });
});

describe('problemParamsSchema', () => {
  it.each([['1', 'A'], ['1950', 'F2'], ['1723', 'GP1'], ['921', '01']])('accepts %s/%s', (contestId, index) => {
    expect(problemParamsSchema.parse({ contestId, index })).toEqual({ contestId, index });
  });

  it('upper-cases the index', () => {
    expect(problemParamsSchema.parse({ contestId: '4', index: 'b1' }).index).toBe('B1');
  });

  it.each([['0', 'A'], ['01', 'A'], ['x', 'A'], ['1', 'ABCD'], ['1', 'A-1'], ['1', '']])(
    'rejects %s/%s',
    (contestId, index) => {
      expect(problemParamsSchema.safeParse({ contestId, index }).success).toBe(false);
    },
  );
});

describe('similarQuerySchema', () => {
  it('defaults k to 10 and ratingWindow to 300', () => {
    expect(similarQuerySchema.parse({})).toEqual({ k: 10, ratingWindow: 300 });
  });

  it('accepts bounds and rejects values outside them', () => {
    expect(similarQuerySchema.parse({ k: '30', ratingWindow: '50' })).toEqual({ k: 30, ratingWindow: 50 });
    expect(similarQuerySchema.safeParse({ k: '31' }).success).toBe(false);
    expect(similarQuerySchema.safeParse({ k: '0' }).success).toBe(false);
    expect(similarQuerySchema.safeParse({ ratingWindow: '1001' }).success).toBe(false);
    expect(similarQuerySchema.safeParse({ ratingWindow: 'abc' }).success).toBe(false);
  });
});
