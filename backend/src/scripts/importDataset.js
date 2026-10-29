import { fileURLToPath } from 'node:url';
import { Problem } from '../modules/problems/problem.model.js';
import { prepareImport } from '../modules/problems/helpers/prepareImport.js';
import { readParquet } from './import/readParquet.js';
import { bulkUpsert } from './import/bulkUpsert.js';
import { isEntryPoint, runAsMain } from './runScript.js';

export const DEFAULT_DATASET_PATH = fileURLToPath(new URL('../../data/cf_problems.parquet', import.meta.url));

export const DATASET_COLUMNS = Object.freeze([
  'id', 'contest_id', 'index', 'title', 'description', 'input_format',
  'output_format', 'note', 'editorial', 'rating', 'tags',
]);

/**
 * Loads the HF parquet snapshot into `problems`. Safe to re-run: upserts by _id with `$set`
 * (hf text replaces an earlier cf_api stub of the same problem).
 */
export const importDataset = async ({
  path = DEFAULT_DATASET_PATH,
  model = Problem,
  read = readParquet,
  logger,
  batchSize,
} = {}) => {
  const rows = await read(path, { columns: [...DATASET_COLUMNS] });
  const { docs, summary } = prepareImport(rows);
  logger?.info({ rows: rows.length, toUpsert: docs.length }, 'Dataset read, upserting');
  const onBatch = ({ batchIndex, totals }) => logger?.debug({ batchIndex, totals }, 'Batch written');
  const totals = await bulkUpsert(model, docs, { batchSize, onBatch });
  return {
    ...summary,
    upserted: totals.upserted,
    updated: totals.modified,
    unchanged: totals.matched - totals.modified,
    batches: totals.batches,
    totalInCollection: await model.estimatedDocumentCount(),
  };
};

/* c8 ignore next 3 -- only runs as `npm run import:dataset` */
if (isEntryPoint(import.meta.url)) {
  await runAsMain('import:dataset', ({ logger }) => importDataset({ logger }));
}
