import { expect } from 'vitest';
import { toAppError } from '../../src/errors/mappers/index.js';

/** Paths that fail validation for `doc` on `Model` (empty array when valid). */
export const invalidPaths = (Model, doc) => Object.keys(new Model(doc).validateSync()?.errors ?? {});

/** Awaits a write expected to hit a unique index; checks E11000 and our 409 mapping. */
export const expectDuplicateKey = async (write, fields) => {
  const err = await write.catch((error) => error);
  expect(err?.code).toBe(11000);
  const mapped = toAppError(err);
  expect(mapped.statusCode).toBe(409);
  expect(mapped.code).toBe('DUPLICATE_RESOURCE');
  expect(mapped.details.fields).toEqual(fields);
  return mapped;
};

/** The model's indexes as returned by MongoDB, keyed by index name. */
export const indexesByName = async (Model) =>
  Object.fromEntries((await Model.collection.indexes()).map((index) => [index.name, index]));
