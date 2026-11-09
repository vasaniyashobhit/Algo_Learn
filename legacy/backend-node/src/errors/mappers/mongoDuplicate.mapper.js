import { ConflictError } from '../httpErrors.js';
import { codes } from '../codes.js';

const DUPLICATE_KEY = 11000;

/** Mongo E11000 → 409. Only field names are exposed, never the duplicated values. */
export const mapMongoDuplicateError = (err) => {
  if (err?.code !== DUPLICATE_KEY) return null;
  const fields = Object.keys(err.keyPattern ?? err.keyValue ?? {});
  return new ConflictError(codes.DUPLICATE_RESOURCE, 'This resource already exists', { fields }, {
    cause: err,
  });
};
