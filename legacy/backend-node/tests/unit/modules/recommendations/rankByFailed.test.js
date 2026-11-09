import { describe, expect, it } from 'vitest';
import { maxJaccard, rankByFailed } from '../../../../src/modules/recommendations/helpers/rankByFailed.js';

const failed = [{ tags: ['dp', 'greedy'] }, { tags: ['graphs'] }];

describe('maxJaccard', () => {
  it('is the best jaccard against any failed problem', () => {
    expect(maxJaccard(['dp'], failed)).toBe(0.5);
    expect(maxJaccard(['graphs'], failed)).toBe(1);
    expect(maxJaccard(['dp'], [])).toBe(0);
  });
});

describe('rankByFailed', () => {
  it('sorts by similarity desc, then rating asc (unrated last), then id', () => {
    const ranked = rankByFailed([
      { id: '1/A', rating: 1500, tags: ['math'] },
      { id: '2/A', rating: 1700, tags: ['graphs'] },
      { id: '3/A', rating: null, tags: ['math'] },
      { id: '4/A', rating: 1400, tags: ['math'] },
      { id: '0/A', rating: 1500, tags: ['math'] },
      { id: '5/A', rating: 1600 },
    ], failed);
    expect(ranked.map(({ id }) => id)).toEqual(['2/A', '4/A', '0/A', '1/A', '5/A', '3/A']);
    expect(ranked[0].similarityToFailed).toBe(1);
  });

  it('rounds the similarity to 4 decimals', () => {
    const [item] = rankByFailed([{ id: '1/A', rating: 1, tags: ['dp'] }], [{ tags: ['dp', 'greedy', 'math'] }]);
    expect(item.similarityToFailed).toBe(0.3333);
  });
});
