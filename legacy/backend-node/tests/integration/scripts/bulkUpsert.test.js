import { describe, expect, it, vi } from 'vitest';
import { Problem } from '../../../src/modules/problems/problem.model.js';
import { BATCH_SIZE, bulkUpsert, chunk } from '../../../src/scripts/import/bulkUpsert.js';
import { AppError } from '../../../src/errors/AppError.js';
import { useTestDB } from '../../helpers/db.js';
import { makeProblem } from '../../helpers/factories.js';

useTestDB();

const problems = (n, overrides = {}) => Array.from({ length: n }, () => makeProblem(overrides));

describe('chunk', () => {
  it('splits into fixed-size batches and validates the size', () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    expect(chunk([], 500)).toEqual([]);
    expect(() => chunk([1], 0)).toThrow(TypeError);
  });
});

describe('bulkUpsert', () => {
  it('uses batches of 500 by default', async () => {
    expect(BATCH_SIZE).toBe(500);
    const onBatch = vi.fn();
    const totals = await bulkUpsert(Problem, problems(501), { onBatch });
    expect(totals).toMatchObject({ batches: 2, upserted: 501 });
    expect(onBatch.mock.calls.map(([info]) => info.size)).toEqual([500, 1]);
  });

  it('is idempotent: a second run inserts nothing and changes nothing', async () => {
    const docs = problems(7);
    const first = await bulkUpsert(Problem, docs, { batchSize: 3 });
    const second = await bulkUpsert(Problem, docs, { batchSize: 3 });
    expect(first).toEqual({ batches: 3, upserted: 7, modified: 0, matched: 0 });
    expect(second.upserted).toBe(0);
    expect(second.matched).toBe(7);
    expect(await Problem.countDocuments()).toBe(7);
  });

  it('$set mode overwrites existing fields', async () => {
    const [doc] = problems(1);
    await bulkUpsert(Problem, [doc]);
    const totals = await bulkUpsert(Problem, [{ ...doc, title: 'Renamed' }]);
    expect(totals.modified).toBe(1);
    expect((await Problem.findById(doc._id).lean()).title).toBe('Renamed');
  });

  it('$setOnInsert mode never touches existing documents (not even updatedAt)', async () => {
    const [doc] = problems(1);
    await Problem.create(doc);
    const before = await Problem.findById(doc._id).lean();
    const fresh = makeProblem({ source: 'cf_api' });
    const totals = await bulkUpsert(Problem, [{ ...doc, title: 'X', description: '' }, fresh], { operator: '$setOnInsert' });
    expect(totals).toMatchObject({ upserted: 1, modified: 0, matched: 1 });
    expect(await Problem.findById(doc._id).lean()).toEqual(before);
    const inserted = await Problem.findById(fresh._id).lean();
    expect(inserted.createdAt).toBeInstanceOf(Date);
    expect(inserted.updatedAt).toEqual(inserted.createdAt);
  });

  it('adds timestamps in $set mode', async () => {
    const [doc] = problems(1);
    await bulkUpsert(Problem, [doc]);
    expect((await Problem.findById(doc._id).lean()).createdAt).toBeInstanceOf(Date);
  });

  it('wraps database failures in an AppError naming the batch', async () => {
    const model = { bulkWrite: vi.fn(async () => { throw new Error('connection lost'); }) };
    const err = await bulkUpsert(model, problems(2)).catch((e) => e);
    expect(err).toBeInstanceOf(AppError);
    expect(err).toMatchObject({ code: 'INTERNAL_ERROR', details: { batchIndex: 0, batchSize: 2 } });
    expect(err.cause.message).toBe('connection lost');
  });
});
