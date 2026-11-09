import mongoose from 'mongoose';

export const { ObjectId } = mongoose.Schema.Types;

/** Fields that must never reach a client, whatever the model. */
export const HIDDEN_FIELDS = Object.freeze(['__v', 'passwordHash']);

/** toJSON transform: drops HIDDEN_FIELDS and keeps `_id`. */
export const hideInternalFields = (_doc, ret) => {
  HIDDEN_FIELDS.forEach((field) => delete ret[field]);
  return ret;
};

/** Builds a schema with the shared options (timestamps, toJSON transform). */
export const createSchema = (definition, options = {}) =>
  new mongoose.Schema(definition, {
    timestamps: true,
    toJSON: { transform: hideInternalFields },
    ...options,
  });

/** Required ObjectId reference to another model. */
export const requiredRef = (ref) => ({ type: ObjectId, ref, required: true });

/** Optional enum string: stays unset unless one of `values` is given. */
export const optionalEnum = (values) => ({ type: String, enum: [...values] });
