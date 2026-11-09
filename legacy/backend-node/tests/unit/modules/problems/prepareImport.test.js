import { describe, expect, it } from 'vitest';
import { prepareImport } from '../../../../src/modules/problems/helpers/prepareImport.js';

const row = (id, overrides = {}) => {
  const [contestId, index] = id.split('/');
  return { id, contest_id: contestId, index, title: `P ${id}`, description: 'Text', rating: 1200n, tags: ['dp'], ...overrides };
};

describe('prepareImport', () => {
  it('counts read, skipped, rejected, rating, tags, editorial and *special', () => {
    const rows = [
      row('1/A', { editorial: 'Idea' }),
      row('1/B', { rating: null, tags: [] }),
      row('1723/GP1', { tags: ['*special'] }),
      row('921/01'),
      row('2/A', { description: '  ' }),
      row('3/A', { tags: ['not-a-tag'] }),
    ];
    const { docs, summary } = prepareImport(rows);
    expect(docs.map((d) => d._id)).toEqual(['1/A', '1/B', '1723/GP1', '921/01']);
    expect(summary).toEqual({
      read: 6,
      skippedEmptyDescription: 1,
      rejected: 1,
      rejectedByReason: { unknownTag: 1 },
      rejectedIds: ['3/A'],
      toUpsert: 4,
      withRating: 3,
      withTags: 3,
      withEditorial: 1,
      withSpecialTag: 1,
    });
  });

  it('reports zero rejections for clean input', () => {
    expect(prepareImport([row('1/A')]).summary).toMatchObject({ rejected: 0, rejectedByReason: {} });
  });

  it('handles an empty dataset', () => {
    expect(prepareImport([]).summary).toMatchObject({ read: 0, toUpsert: 0 });
  });
});
