import mongoose from 'mongoose';
import { createSchema } from '../../db/schema.js';

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const CF_HANDLE_PATTERN = /^[A-Za-z0-9_.-]{3,24}$/;

const nullableNumber = { type: Number, default: null };
const nullableDate = { type: Date, default: null };

const userSchema = createSchema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 254,
      match: EMAIL_PATTERN,
    },
    // Hidden from queries unless asked for with .select('+passwordHash'); stripped by toJSON.
    passwordHash: { type: String, required: true, select: false },
    name: { type: String, trim: true, maxlength: 80, default: '' },
    // Left unset until linked (no default), so unlinked users don't collide in the index.
    cfHandle: { type: String, trim: true, match: CF_HANDLE_PATTERN },
    cfRating: nullableNumber,
    cfMaxRating: nullableNumber,
    lastSyncedAt: nullableDate,
    lastSubmissionId: nullableNumber,
    syncLockedUntil: nullableDate,
  },
  { collection: 'users' },
);

// Codeforces handles are case-insensitive, so uniqueness is too (strength 2 collation).
// Partial instead of sparse: a document with `cfHandle: null` is also skipped.
userSchema.index(
  { cfHandle: 1 },
  {
    unique: true,
    partialFilterExpression: { cfHandle: { $type: 'string' } },
    collation: { locale: 'en', strength: 2 },
  },
);

export const User = mongoose.model('User', userSchema);
