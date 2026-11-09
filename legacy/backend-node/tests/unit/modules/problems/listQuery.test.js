import { describe, expect, it } from 'vitest';
import { buildListFilter, buildListSort } from '../../../../src/modules/problems/helpers/listQuery.js';

// mongoose.trusted() adds a symbol key; compare the plain operators and check the marker apart.
const plain = (value) => JSON.parse(JSON.stringify(value));
const filter = (input) => plain(buildListFilter(input));

describe('buildListFilter', () => {
  it('is empty without filters', () => {
    expect(filter()).toEqual({});
    expect(filter({ tags: [] })).toEqual({});
  });

  it('matches any tag by default and all tags with matchAll', () => {
    expect(filter({ tags: ['dp', 'math'] })).toEqual({ tags: { $in: ['dp', 'math'] } });
    expect(filter({ tags: ['dp', 'math'], matchAll: true })).toEqual({ tags: { $all: ['dp', 'math'] } });
  });

  it('builds open or closed rating ranges, including 0', () => {
    expect(filter({ minRating: 800 })).toEqual({ rating: { $gte: 800 } });
    expect(filter({ maxRating: 0 })).toEqual({ rating: { $lte: 0 } });
    expect(filter({ minRating: 800, maxRating: 1200 })).toEqual({ rating: { $gte: 800, $lte: 1200 } });
  });

  it('marks every operator object as trusted (sanitizeFilter is global)', () => {
    const built = buildListFilter({ tags: ['dp'], minRating: 1, q: 'x' });
    [built.tags, built.rating, built.$text].forEach((operators) => {
      expect(Object.getOwnPropertySymbols(operators)).toHaveLength(1);
    });
  });

  it('adds a $text search for q', () => {
    expect(filter({ q: 'two arrays' })).toEqual({ $text: { $search: 'two arrays' } });
  });
});

describe('buildListSort', () => {
  it('sorts newest contest first, then index', () => {
    expect(buildListSort()).toEqual({ contestId: -1, index: 1 });
  });

  it('puts text relevance first when searching', () => {
    expect(buildListSort({ q: 'tree' })).toEqual({ score: { $meta: 'textScore' }, contestId: -1, index: 1 });
  });
});
