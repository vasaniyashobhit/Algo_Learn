import { describe, expect, it } from 'vitest';
import { neighborRating, neighborTags } from '../../../../src/modules/stuck/helpers/neighbors.js';

const n = (tags, rating = null) => ({ tags, rating });

describe('neighborTags', () => {
  it('keeps tags shared by at least 2 neighbors, most common first', () => {
    const near = [n(['dp', 'math']), n(['dp', 'greedy']), n(['dp', 'math', '*special']), n(['graphs']), n(['greedy'])];
    expect(neighborTags(near)).toEqual(['dp', 'greedy', 'math']);
  });

  it('falls back to the single most frequent tag (alphabetical tie) when none is shared', () => {
    expect(neighborTags([n(['math']), n(['dp']), n(['trees'])])).toEqual(['dp']);
  });

  it('counts a tag once per neighbor, caps the list and ignores missing tags', () => {
    const near = [n(['dp', 'dp', 'a', 'math']), n(['dp', 'math', 'greedy', 'graphs', 'trees', 'strings'])];
    near.push(n(['greedy', 'graphs', 'trees', 'strings']), { rating: 1 });
    expect(neighborTags(near, 3)).toEqual(['dp', 'graphs', 'greedy']);
  });

  it('returns nothing for no neighbors', () => {
    expect(neighborTags([])).toEqual([]);
  });
});

describe('neighborRating', () => {
  it('is the median of the rated neighbors rounded to 100', () => {
    expect(neighborRating([n([], 1200), n([], 1500), n([], null), n([], 1700)])).toBe(1500);
    expect(neighborRating([n([], 1200), n([], 1500)])).toBe(1400);
  });

  it('is null when no neighbor is rated', () => {
    expect(neighborRating([n([], null)])).toBeNull();
  });
});
