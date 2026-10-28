import multer from 'multer';
import { PayloadError, ValidationError } from '../httpErrors.js';
import { codes } from '../codes.js';

export const mapMulterError = (err) => {
  if (!(err instanceof multer.MulterError)) return null;
  const options = { cause: err };
  if (err.code === 'LIMIT_FILE_SIZE') {
    return new PayloadError(codes.FILE_TOO_LARGE, 'The uploaded file is too large', null, options);
  }
  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    const details = [{ field: err.field, message: 'Unexpected file field' }];
    return new PayloadError(codes.FILE_TYPE_UNSUPPORTED, 'Unsupported file upload', details, options);
  }
  const details = [{ field: err.field ?? 'file', message: err.message }];
  return new ValidationError(codes.VALIDATION_FAILED, 'Invalid file upload', details, options);
};
