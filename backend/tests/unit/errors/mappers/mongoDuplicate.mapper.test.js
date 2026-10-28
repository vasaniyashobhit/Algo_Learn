import { describe, expect, it } from 'vitest';
import { mapMongoDuplicateError } from '../../../../src/errors/mappers/mongoDuplicate.mapper.js';

const duplicate = (props) => Object.assign(new Error('E11000 duplicate key'), { code: 11000, ...props });

describe('mapMongoDuplicateError', () => {
  it('maps E11000 to 409 DUPLICATE_RESOURCE with field names only', () => {
    const err = duplicate({ keyPattern: { email: 1 }, keyValue: { email: 'a@b.c' } });
    const mapped = mapMongoDuplicateError(err);
    expect(mapped.statusCode).toBe(409);
    expect(mapped.code).toBe('DUPLICATE_RESOURCE');
    expect(mapped.details).toEqual({ fields: ['email'] });
    expect(JSON.stringify(mapped.details)).not.toContain('a@b.c');
    expect(mapped.cause).toBe(err);
  });

  it('falls back to keyValue, then to no fields', () => {
    expect(mapMongoDuplicateError(duplicate({ keyValue: { handle: 'x' } })).details).toEqual({ fields: ['handle'] });
    expect(mapMongoDuplicateError(duplicate({})).details).toEqual({ fields: [] });
  });

  it('returns null for other errors', () => {
    expect(mapMongoDuplicateError(Object.assign(new Error('x'), { code: 121 }))).toBeNull();
    expect(mapMongoDuplicateError(null)).toBeNull();
  });
});
