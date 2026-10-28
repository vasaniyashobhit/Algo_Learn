import mongoose from 'mongoose';
import { createSchema, optionalEnum, requiredRef } from '../../db/schema.js';
import {
  ANSWER_SOURCES,
  GAP_STATUSES,
  STUCK_INPUT_TYPES,
  STUCK_RAW_INPUT_MAX,
  TAG_SOURCES,
} from '../../config/constants.js';

/** Setter: keep at most STUCK_RAW_INPUT_MAX characters of the user's input. */
export const truncateRawInput = (value) =>
  typeof value === 'string' ? value.slice(0, STUCK_RAW_INPUT_MAX) : value;

const gapItemSchema = new mongoose.Schema(
  {
    topicKey: { type: String, required: true },
    strength: { type: Number, required: true, min: 0, max: 1 },
    status: { type: String, required: true, enum: [...GAP_STATUSES] },
  },
  { _id: false },
);

const stuckQuerySchema = createSchema(
  {
    userId: requiredRef('User'),
    inputType: { type: String, required: true, enum: [...STUCK_INPUT_TYPES] },
    rawInput: { type: String, default: '', set: truncateRawInput },
    matchedProblemId: { type: String, ref: 'Problem', default: null },
    detectedTags: { type: [String], default: [] },
    tagsSource: optionalEnum(TAG_SOURCES),
    estimatedRating: { type: Number, default: null },
    gap: { type: [gapItemSchema], default: [] },
    result: { type: mongoose.Schema.Types.Mixed, default: null },
    source: { type: String, required: true, enum: [...ANSWER_SOURCES] },
  },
  { collection: 'stuckqueries', timestamps: { createdAt: true, updatedAt: false } },
);

stuckQuerySchema.index({ userId: 1, createdAt: -1 });

export const StuckQuery = mongoose.model('StuckQuery', stuckQuerySchema);
