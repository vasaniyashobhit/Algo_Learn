import { describe, expect, it } from 'vitest';
import mongoose from 'mongoose';
import { mapMongooseError } from '../../../../src/errors/mappers/mongoose.mapper.js';

const Sample = mongoose.model(
  'MapperSample',
  new mongoose.Schema({ name: { type: String, required: true }, rating: { type: Number, min: 800 } }),
);

describe('mapMongooseError', () => {
  it('maps a ValidationError to 400 with one detail per path', () => {
    const err = new Sample({ rating: 100 }).validateSync();
    const mapped = mapMongooseError(err);
    expect(mapped.statusCode).toBe(400);
    expect(mapped.code).toBe('VALIDATION_FAILED');
    expect(mapped.cause).toBe(err);
    expect(mapped.details.map((d) => d.field).toSorted()).toEqual(['name', 'rating']);
  });

  it('maps a CastError to 400 without echoing the raw value', () => {
    const err = new mongoose.Error.CastError('ObjectId', 'not-an-id', 'userId');
    const mapped = mapMongooseError(err);
    expect(mapped.statusCode).toBe(400);
    expect(mapped.details).toEqual([{ field: 'userId', message: 'Invalid value for userId' }]);
    expect(JSON.stringify(mapped.details)).not.toContain('not-an-id');
  });

  it('returns null for other errors', () => {
    expect(mapMongooseError(new Error('x'))).toBeNull();
  });
});
