import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { Problem } from '../../../src/modules/problems/problem.model.js';
import { DATASET_COLUMNS, DEFAULT_DATASET_PATH, importDataset } from '../../../src/scripts/importDataset.js';
import { useTestDB } from '../../helpers/db.js';
import { writeFixtureParquet } from '../../helpers/parquetFixture.js';

useTestDB();

describe('importDataset', () => {
  let fixture;
  beforeAll(async () => {
    fixture = await writeFixtureParquet();
  });
  afterAll(() => fixture.cleanup());

  it('points at backend/data/cf_problems.parquet and reads the 11 dataset columns', () => {
    expect(DEFAULT_DATASET_PATH.replaceAll('\\', '/')).toMatch(/backend\/data\/cf_problems\.parquet$/);
    expect(DATASET_COLUMNS).toHaveLength(11);
  });

  it('imports a parquet file and returns the summary (unusual ids accepted)', async () => {
    const summary = await importDataset({ path: fixture.filename });
    expect(summary).toMatchObject({
      read: 4, skippedEmptyDescription: 1, rejected: 0, toUpsert: 3, upserted: 3,
      withRating: 2, withTags: 2, withEditorial: 1, withSpecialTag: 1, totalInCollection: 3,
    });
    expect((await Problem.find().lean()).map((p) => p._id).toSorted()).toEqual(['1/A', '1723/GP1', '921/01']);
    expect(await Problem.findById('1723/GP1').lean()).toMatchObject({ tags: ['*special'], tagCount: 1, rating: null });
  });

  it('stored documents pass full schema validation', async () => {
    await importDataset({ path: fixture.filename });
    const docs = await Problem.find();
    await Promise.all(docs.map((doc) => doc.validate()));
  });

  it('is safe to re-run', async () => {
    await importDataset({ path: fixture.filename });
    const second = await importDataset({ path: fixture.filename });
    expect(second).toMatchObject({ upserted: 0, updated: 0, unchanged: 3, totalInCollection: 3 });
  });

  it('replaces a cf_api stub with the hf text', async () => {
    await Problem.create({ _id: '1/A', contestId: 1, index: 'A', title: 'Stub', source: 'cf_api' });
    const summary = await importDataset({ path: fixture.filename });
    expect(summary).toMatchObject({ upserted: 2, updated: 1 });
    expect(await Problem.findById('1/A').lean()).toMatchObject({ source: 'hf', description: 'Tiles.', hasEditorial: true });
  });

  it('logs progress and uses an injected reader', async () => {
    const logger = { info: vi.fn(), debug: vi.fn() };
    const read = vi.fn(async () => [{ id: '7/A', contest_id: '7', index: 'A', title: 'T', description: 'D', tags: [] }]);
    const summary = await importDataset({ read, logger, path: 'p.parquet', batchSize: 1 });
    expect(read).toHaveBeenCalledWith('p.parquet', { columns: [...DATASET_COLUMNS] });
    expect(summary).toMatchObject({ upserted: 1, batches: 1 });
    expect(logger.info).toHaveBeenCalled();
    expect(logger.debug).toHaveBeenCalledWith(expect.objectContaining({ batchIndex: 0 }), 'Batch written');
  });
});
