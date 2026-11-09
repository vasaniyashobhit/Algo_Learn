import { describe, expect, it } from 'vitest';
import mongoose from 'mongoose';
import {
  HIDDEN_FIELDS,
  createSchema,
  hideInternalFields,
  optionalEnum,
  requiredRef,
} from '../../../src/db/schema.js';

describe('hideInternalFields', () => {
  it('removes __v and passwordHash and keeps _id', () => {
    const ret = { _id: 'x', __v: 0, passwordHash: 'h', email: 'a@b.c' };
    expect(hideInternalFields({}, ret)).toEqual({ _id: 'x', email: 'a@b.c' });
    expect(HIDDEN_FIELDS).toEqual(['__v', 'passwordHash']);
  });
});

describe('createSchema', () => {
  it('enables timestamps and the toJSON transform, and lets options override', () => {
    const schema = createSchema({ a: String }, { collection: 'things' });
    expect(schema.get('timestamps')).toBe(true);
    expect(schema.get('toJSON').transform).toBe(hideInternalFields);
    expect(schema.get('collection')).toBe('things');
    expect(createSchema({}, { timestamps: false }).get('timestamps')).toBe(false);
  });

  it('applies the transform on toJSON', () => {
    const Thing = mongoose.model('SchemaTestThing', createSchema({ passwordHash: String, name: String }));
    const json = new Thing({ name: 'n', passwordHash: 'secret' }).toJSON();
    expect(json).toHaveProperty('_id');
    expect(json).not.toHaveProperty('passwordHash');
    expect(json).not.toHaveProperty('__v');
  });
});

describe('field helpers', () => {
  it('requiredRef builds a required ObjectId reference', () => {
    expect(requiredRef('User')).toEqual({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true });
  });

  it('optionalEnum copies the values and has no default', () => {
    const values = Object.freeze(['a', 'b']);
    const field = optionalEnum(values);
    expect(field).toEqual({ type: String, enum: ['a', 'b'] });
    expect(field.enum).not.toBe(values);
  });
});
