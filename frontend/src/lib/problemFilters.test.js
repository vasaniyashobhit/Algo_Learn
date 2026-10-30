import { describe, expect, it } from 'vitest';
import { hasFilters, readFilters, setFilter, toQueryParams, toSearch } from './problemFilters.js';

const NONE = { tag: null, minRating: null, maxRating: null, page: 1 };

describe('problem filters', () => {
  it('reads the URL and drops anything invalid', () => {
    expect(readFilters(new URLSearchParams('tag=dp&min=1400&max=1800&page=3'))).toEqual({
      tag: 'dp',
      minRating: 1400,
      maxRating: 1800,
      page: 3,
    });
    expect(readFilters(new URLSearchParams('min=1450&max=abc&page=-2'))).toEqual(NONE);
    expect(readFilters(new URLSearchParams(''))).toEqual(NONE);
  });

  it('writes only what is set, and leaves page 1 out', () => {
    expect(toSearch({ tag: 'dp', minRating: 1400, maxRating: null, page: 1 })).toEqual({ tag: 'dp', min: '1400' });
    expect(toSearch({ ...NONE, page: 2 })).toEqual({ page: '2' });
  });

  it('goes back to page 1 on any change and keeps the range valid', () => {
    const current = { tag: null, minRating: 1400, maxRating: 1600, page: 4 };
    expect(setFilter(current, 'tag', 'dp')).toEqual({ ...current, tag: 'dp', page: 1 });
    expect(setFilter(current, 'minRating', 1900)).toMatchObject({ minRating: 1900, maxRating: 1900 });
    expect(setFilter(current, 'maxRating', 1000)).toMatchObject({ minRating: 1000, maxRating: 1000 });
    expect(setFilter(current, 'maxRating', null)).toMatchObject({ minRating: 1400, maxRating: null });
  });

  it('builds the GET /problems params', () => {
    expect(toQueryParams({ tag: 'dp', minRating: 1400, maxRating: 1800, page: 2 })).toEqual({
      tags: 'dp',
      minRating: 1400,
      maxRating: 1800,
      page: 2,
      limit: 20,
    });
    expect(toQueryParams(NONE)).toEqual({ page: 1, limit: 20 });
  });

  it('knows whether anything is filtered', () => {
    expect(hasFilters(NONE)).toBe(false);
    expect(hasFilters({ ...NONE, maxRating: 1200 })).toBe(true);
  });
});
