import { describe, expect, it } from 'vitest';
import { buildCfApiUpdates, hasChanged, updateCfApiRows } from '../../../src/scripts/import/updateCfApiRows.js';

const now = new Date('2026-11-01T03:00:00Z');

describe('hasChanged', () => {
  it('detects a different rating, including null ↔ number', () => {
    expect(hasChanged({ rating: 1500, tags: [] }, { rating: 1600, tags: [] })).toBe(true);
    expect(hasChanged({ rating: null, tags: [] }, { rating: 1600, tags: [] })).toBe(true);
    expect(hasChanged({ tags: [] }, { rating: null, tags: [] })).toBe(false);
  });

  it('compares tags as a set', () => {
    expect(hasChanged({ rating: 1, tags: ['dp', 'math'] }, { rating: 1, tags: ['math', 'dp'] })).toBe(false);
    expect(hasChanged({ rating: 1, tags: ['dp'] }, { rating: 1, tags: ['dp', 'math'] })).toBe(true);
    expect(hasChanged({ rating: 1 }, { rating: 1, tags: [] })).toBe(false);
  });
});

describe('buildCfApiUpdates', () => {
  it('builds $set operations for changed rows only, guarded by source cf_api', () => {
    const rows = [{ _id: '1/A', rating: 800, tags: ['math'] }, { _id: '2/A', rating: 900, tags: [] }, { _id: '3/A', rating: 1 }];
    const docs = [{ _id: '1/A', rating: 1000, tags: ['math', 'dp'] }, { _id: '2/A', rating: 900, tags: [] }];
    expect(buildCfApiUpdates(rows, docs, now)).toEqual([{
      updateOne: {
        filter: { _id: '1/A', source: 'cf_api' },
        update: { $set: { rating: 1000, tags: ['math', 'dp'], tagCount: 2, updatedAt: now } },
        timestamps: false,
      },
    }]);
  });
});

describe('updateCfApiRows', () => {
  it('wraps database failures in a 500 AppError', async () => {
    const cause = new Error('db down');
    const model = { find: () => ({ lean: async () => { throw cause; } }) };
    await expect(updateCfApiRows(model, [])).rejects.toMatchObject({ statusCode: 500, code: 'INTERNAL_ERROR', cause });
  });
});
