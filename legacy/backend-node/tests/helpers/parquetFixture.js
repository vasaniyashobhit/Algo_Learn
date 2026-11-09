import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parquetWriteFile } from 'hyparquet-writer';

const text = (name, data) => ({ name, data, type: 'STRING' });

/** Rows shaped like the DuckDB export: contest_id as text, rating INT64 (BigInt), tags as a list. */
export const FIXTURE_ROWS = [
  { id: '1/A', contest_id: '1', index: 'A', title: 'Theatre Square', description: 'Tiles.', editorial: 'Ceil.', rating: 1000n, tags: ['math'] },
  { id: '1723/GP1', contest_id: '1723', index: 'GP1', title: 'Special', description: 'Odd id.', editorial: null, rating: null, tags: ['*special', '*special'] },
  { id: '921/01', contest_id: '921', index: '01', title: 'Numbered', description: 'Digits.', editorial: null, rating: 3500n, tags: [] },
  { id: '5/B', contest_id: '5', index: 'B', title: 'Empty', description: '   ', editorial: null, rating: 1500n, tags: ['dp'] },
];

const column = (name) => FIXTURE_ROWS.map((row) => row[name] ?? null);

/** Writes the fixture to a temp dir. Returns its path and a cleanup function. */
export const writeFixtureParquet = async () => {
  const dir = await mkdtemp(join(tmpdir(), 'cp-coach-parquet-'));
  const filename = join(dir, 'fixture.parquet');
  await parquetWriteFile({
    filename,
    columnData: [
      ...['id', 'contest_id', 'index', 'title', 'description'].map((name) => text(name, column(name))),
      ...['input_format', 'output_format', 'note'].map((name) => text(name, FIXTURE_ROWS.map(() => 'x'))),
      text('editorial', column('editorial')),
      { name: 'rating', data: column('rating'), type: 'INT64' },
      { name: 'tags', data: column('tags') },
    ],
  });
  return { filename, cleanup: () => rm(dir, { recursive: true, force: true }) };
};
