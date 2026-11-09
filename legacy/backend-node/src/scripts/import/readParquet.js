import { asyncBufferFromFile, parquetReadObjects } from 'hyparquet';
import { AppError } from '../../errors/AppError.js';
import { codes } from '../../errors/codes.js';

/** INT64 columns come back as BigInt; JSON and Mongo want plain Numbers. */
const plainValue = (value) => (typeof value === 'bigint' ? Number(value) : value);

export const toPlainRow = (row) =>
  Object.fromEntries(Object.entries(row).map(([key, value]) => [key, plainValue(value)]));

/**
 * Reads every row of a parquet file as plain objects (snappy is built into hyparquet).
 * `reader` is injectable for tests. Failures become a 500 AppError naming the file.
 */
export const readParquet = async (path, {
  columns,
  reader = { asyncBufferFromFile, parquetReadObjects },
} = {}) => {
  try {
    const file = await reader.asyncBufferFromFile(path);
    const rows = await reader.parquetReadObjects({ file, columns });
    return rows.map(toPlainRow);
  } catch (err) {
    throw new AppError(500, codes.INTERNAL_ERROR, `Could not read parquet file: ${path}`,
      { path }, { cause: err });
  }
};
