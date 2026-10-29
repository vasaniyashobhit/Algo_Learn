import { describe, expect, it } from 'vitest';
import { solvedByRating } from '../../../../src/modules/stats/helpers/ratingBands.js';

const solvedCounts = (result) => Object.fromEntries(result.bands.map(({ from, solved }) => [from, solved]));

describe('solvedByRating', () => {
  it('lists every 200-wide band from 800 to 3400 with zeros', () => {
    const { bands, unrated } = solvedByRating([]);
    expect(bands).toHaveLength(14);
    expect(bands[0]).toEqual({ from: 800, to: 999, solved: 0 });
    expect(bands.at(-1)).toEqual({ from: 3400, to: 3599, solved: 0 });
    expect(unrated).toBe(0);
  });

  it('counts solved problems only, by band', () => {
    const result = solvedByRating([
      { solved: true, rating: 1200 },
      { solved: true, rating: 1399 },
      { solved: true, rating: 1400 },
      { solved: false, rating: 1200 },
      { solved: true, rating: null },
      { solved: true, rating: undefined },
    ]);
    expect(solvedCounts(result)).toMatchObject({ 1200: 2, 1400: 1, 800: 0 });
    expect(result.unrated).toBe(2);
  });

  it('clamps ratings outside the range into the first/last band', () => {
    const result = solvedByRating([{ solved: true, rating: 500 }, { solved: true, rating: 3800 }]);
    expect(solvedCounts(result)).toMatchObject({ 800: 1, 3400: 1 });
  });
});
