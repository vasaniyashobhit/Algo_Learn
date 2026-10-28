import { PayloadError, ValidationError } from '../httpErrors.js';
import { codes } from '../codes.js';

/** Handles body-parser failures: malformed JSON (400) and oversized bodies (413). */
export const mapJsonSyntaxError = (err) => {
  if (err?.type === 'entity.parse.failed') {
    const details = [{ field: 'body', message: 'Body is not valid JSON' }];
    return new ValidationError(codes.VALIDATION_FAILED, 'Malformed JSON body', details, { cause: err });
  }
  if (err?.type === 'entity.too.large') {
    return new PayloadError(codes.FILE_TOO_LARGE, 'Request body is too large', null, { cause: err });
  }
  return null;
};
