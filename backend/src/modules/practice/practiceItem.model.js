import mongoose from 'mongoose';
import { createSchema, requiredRef } from '../../db/schema.js';
import { PRACTICE_ORIGINS, PRACTICE_STATUSES } from '../../config/constants.js';

const practiceItemSchema = createSchema(
  {
    userId: requiredRef('User'),
    problemId: { type: String, required: true, ref: 'Problem' },
    status: { type: String, enum: [...PRACTICE_STATUSES], default: 'todo' },
    addedFrom: { type: String, enum: [...PRACTICE_ORIGINS], default: 'manual' },
  },
  { collection: 'practiceitems' },
);

practiceItemSchema.index({ userId: 1, problemId: 1 }, { unique: true });

export const PracticeItem = mongoose.model('PracticeItem', practiceItemSchema);
