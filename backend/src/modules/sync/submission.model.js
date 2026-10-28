import mongoose from 'mongoose';
import { createSchema, requiredRef } from '../../db/schema.js';
import { CF_VERDICTS } from '../../config/constants.js';

const submissionSchema = createSchema(
  {
    cfSubmissionId: { type: Number, required: true, unique: true, min: 1 },
    userId: requiredRef('User'),
    problemId: { type: String, required: true, ref: 'Problem' },
    contestId: { type: Number, required: true, min: 1 },
    index: { type: String, required: true },
    // Copied from the CF API at sync time, so stats never need a join with `problems`.
    problemRating: { type: Number, default: null },
    problemTags: { type: [String], default: [] },
    verdict: { type: String, required: true, enum: [...CF_VERDICTS] },
    submittedAt: { type: Date, required: true },
  },
  { collection: 'submissions' },
);

submissionSchema.index({ userId: 1, submittedAt: -1 });

export const Submission = mongoose.model('Submission', submissionSchema);
