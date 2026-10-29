import mongoose from 'mongoose';
import { createSchema } from '../../db/schema.js';
import { LLM_CACHE_TTL_SECONDS } from '../../config/constants.js';

const llmCacheSchema = createSchema(
  {
    // "problem:<id>" (e.g. "problem:1/A") or "text:<sha256 of the normalized statement>".
    key: { type: String, required: true, unique: true },
    provider: { type: String, required: true },
    model: { type: String, required: true },
    response: { type: mongoose.Schema.Types.Mixed, required: true },
  },
  { collection: 'llmcaches', timestamps: { createdAt: true, updatedAt: false } },
);

// MongoDB's TTL monitor deletes entries this long after createdAt (checked about once a minute).
llmCacheSchema.index({ createdAt: 1 }, { expireAfterSeconds: LLM_CACHE_TTL_SECONDS });

export const LlmCache = mongoose.model('LlmCache', llmCacheSchema);
