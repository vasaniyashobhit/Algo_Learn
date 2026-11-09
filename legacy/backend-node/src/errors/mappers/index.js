import { AppError } from '../AppError.js';
import { codes } from '../codes.js';
import { mapZodError } from './zod.mapper.js';
import { mapMongooseError } from './mongoose.mapper.js';
import { mapMongoDuplicateError } from './mongoDuplicate.mapper.js';
import { mapJwtError } from './jwt.mapper.js';
import { mapMulterError } from './multer.mapper.js';
import { mapJsonSyntaxError } from './jsonSyntax.mapper.js';

export const mappers = Object.freeze([
  mapZodError,
  mapMongooseError,
  mapMongoDuplicateError,
  mapJwtError,
  mapMulterError,
  mapJsonSyntaxError,
]);

/** Normalizes any thrown value into an AppError. Unknown errors become 500 INTERNAL_ERROR. */
export const toAppError = (err) => {
  if (err instanceof AppError) return err;
  for (const mapper of mappers) {
    const mapped = mapper(err);
    if (mapped) return mapped;
  }
  return new AppError(500, codes.INTERNAL_ERROR, 'Something went wrong on our side', null, {
    cause: err,
  });
};
