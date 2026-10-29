import mongoose from 'mongoose';
import { createSchema } from '../../db/schema.js';
import { ALL_TAGS } from '../../config/tags.js';
import { PROBLEM_ID_PATTERN, PROBLEM_SOURCES } from '../../config/constants.js';
import { problemDerivedFields } from './helpers/derivedFields.js';

export { PROBLEM_ID_PATTERN };

const optionalText = { type: String, default: '' };

const problemSchema = createSchema(
  {
    _id: { type: String, required: true, match: PROBLEM_ID_PATTERN },
    contestId: { type: Number, required: true, min: 1 },
    index: { type: String, required: true, trim: true },
    title: { type: String, required: true, trim: true },
    description: optionalText,
    inputFormat: optionalText,
    outputFormat: optionalText,
    note: optionalText,
    editorial: optionalText,
    rating: { type: Number, default: null, min: 0, max: 4000 },
    tags: { type: [{ type: String, enum: [...ALL_TAGS] }], default: [] },
    tagCount: { type: Number, default: 0, min: 0 },
    hasEditorial: { type: Boolean, default: false },
    source: { type: String, enum: [...PROBLEM_SOURCES], default: 'hf' },
  },
  { collection: 'problems' },
);

problemSchema.pre('validate', function setDerivedFields() {
  Object.assign(this, problemDerivedFields(this));
});

problemSchema.index({ tags: 1 });
problemSchema.index({ rating: 1 });
problemSchema.index({ tags: 1, rating: 1 });
problemSchema.index(
  { title: 'text', description: 'text' },
  { name: 'problem_text', weights: { title: 3, description: 1 } },
);

export const Problem = mongoose.model('Problem', problemSchema);
