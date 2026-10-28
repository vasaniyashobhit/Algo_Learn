import { describe, expect, it } from 'vitest';
import multer from 'multer';
import { mapMulterError } from '../../../../src/errors/mappers/multer.mapper.js';

describe('mapMulterError', () => {
  it('maps LIMIT_FILE_SIZE to 413 FILE_TOO_LARGE', () => {
    const err = new multer.MulterError('LIMIT_FILE_SIZE', 'file');
    const mapped = mapMulterError(err);
    expect(mapped.statusCode).toBe(413);
    expect(mapped.code).toBe('FILE_TOO_LARGE');
    expect(mapped.cause).toBe(err);
  });

  it('maps LIMIT_UNEXPECTED_FILE to 415 FILE_TYPE_UNSUPPORTED', () => {
    const mapped = mapMulterError(new multer.MulterError('LIMIT_UNEXPECTED_FILE', 'avatar'));
    expect(mapped.statusCode).toBe(415);
    expect(mapped.code).toBe('FILE_TYPE_UNSUPPORTED');
    expect(mapped.details).toEqual([{ field: 'avatar', message: 'Unexpected file field' }]);
  });

  it('maps other multer limits to 400 VALIDATION_FAILED', () => {
    const mapped = mapMulterError(new multer.MulterError('LIMIT_FILE_COUNT'));
    expect(mapped.statusCode).toBe(400);
    expect(mapped.code).toBe('VALIDATION_FAILED');
    expect(mapped.details[0].field).toBe('file');
  });

  it('returns null for other errors', () => {
    expect(mapMulterError(new Error('x'))).toBeNull();
  });
});
