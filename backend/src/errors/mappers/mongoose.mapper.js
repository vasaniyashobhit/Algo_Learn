import mongoose from 'mongoose';
import { ValidationError } from '../httpErrors.js';
import { codes } from '../codes.js';

const { ValidationError: MongooseValidationError, CastError } = mongoose.Error;

export const mapMongooseError = (err) => {
  if (err instanceof MongooseValidationError) {
    const details = Object.values(err.errors).map(({ path, message }) => ({ field: path, message }));
    return new ValidationError(codes.VALIDATION_FAILED, 'Data validation failed', details, { cause: err });
  }
  if (err instanceof CastError) {
    const details = [{ field: err.path, message: `Invalid value for ${err.path}` }];
    return new ValidationError(codes.VALIDATION_FAILED, 'Invalid identifier or value', details, {
      cause: err,
    });
  }
  return null;
};
