import { describe, expect, it } from 'vitest';
import { mapJsonSyntaxError } from '../../../../src/errors/mappers/jsonSyntax.mapper.js';

const bodyParserError = (type) => Object.assign(new SyntaxError('Unexpected token'), { type });

describe('mapJsonSyntaxError', () => {
  it('maps malformed JSON to 400 VALIDATION_FAILED', () => {
    const err = bodyParserError('entity.parse.failed');
    const mapped = mapJsonSyntaxError(err);
    expect(mapped.statusCode).toBe(400);
    expect(mapped.code).toBe('VALIDATION_FAILED');
    expect(mapped.details).toEqual([{ field: 'body', message: 'Body is not valid JSON' }]);
    expect(mapped.cause).toBe(err);
  });

  it('maps an oversized body to 413 FILE_TOO_LARGE', () => {
    const mapped = mapJsonSyntaxError(bodyParserError('entity.too.large'));
    expect(mapped.statusCode).toBe(413);
    expect(mapped.code).toBe('FILE_TOO_LARGE');
  });

  it('returns null for other errors', () => {
    expect(mapJsonSyntaxError(new SyntaxError('x'))).toBeNull();
    expect(mapJsonSyntaxError(null)).toBeNull();
  });
});
