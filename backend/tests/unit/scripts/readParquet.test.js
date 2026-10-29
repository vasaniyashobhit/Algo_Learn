import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { readParquet, toPlainRow } from '../../../src/scripts/import/readParquet.js';
import { AppError } from '../../../src/errors/AppError.js';
import { writeFixtureParquet } from '../../helpers/parquetFixture.js';

describe('readParquet (real fixture file)', () => {
  let fixture;
  beforeAll(async () => {
    fixture = await writeFixtureParquet();
  });
  afterAll(() => fixture.cleanup());

  it('reads every row as a plain object with all dataset columns', async () => {
    const rows = await readParquet(fixture.filename);
    expect(rows).toHaveLength(4);
    expect(Object.keys(rows[0])).toEqual([
      'id', 'contest_id', 'index', 'title', 'description', 'input_format',
      'output_format', 'note', 'editorial', 'rating', 'tags',
    ]);
    expect(rows[1]).toMatchObject({ id: '1723/GP1', rating: null, tags: ['*special', '*special'] });
  });

  it('converts INT64 BigInt values to Number', async () => {
    const rows = await readParquet(fixture.filename);
    expect(rows.map((row) => row.rating)).toEqual([1000, null, 3500, 1500]);
    expect(typeof rows[0].rating).toBe('number');
  });

  it('can limit the columns read', async () => {
    const [row] = await readParquet(fixture.filename, { columns: ['id', 'rating'] });
    expect(row).toEqual({ id: '1/A', rating: 1000 });
  });

  it('wraps a missing file in a 500 AppError with the path and cause', async () => {
    const err = await readParquet('does/not/exist.parquet').catch((e) => e);
    expect(err).toBeInstanceOf(AppError);
    expect(err).toMatchObject({ statusCode: 500, code: 'INTERNAL_ERROR', details: { path: 'does/not/exist.parquet' } });
    expect(err.cause).toBeDefined();
  });
});

describe('readParquet (mocked reader)', () => {
  it('passes the file buffer and columns to parquetReadObjects', async () => {
    const reader = {
      asyncBufferFromFile: vi.fn(async () => 'buffer'),
      parquetReadObjects: vi.fn(async () => [{ id: '1/A', rating: 7n }]),
    };
    expect(await readParquet('x.parquet', { reader, columns: ['id'] })).toEqual([{ id: '1/A', rating: 7 }]);
    expect(reader.parquetReadObjects).toHaveBeenCalledWith({ file: 'buffer', columns: ['id'] });
  });

  it('toPlainRow only converts BigInt values', () => {
    expect(toPlainRow({ a: 1n, b: 'x', c: null, d: ['t'] })).toEqual({ a: 1, b: 'x', c: null, d: ['t'] });
  });
});
