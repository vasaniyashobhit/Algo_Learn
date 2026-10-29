import { LlmCache } from './llmCache.model.js';
import { validateCoachResponse } from './schema/coachResponse.schema.js';
import { describeLlmError } from './helpers/llmError.js';
import { logger as defaultLogger } from '../../lib/logger.js';

/**
 * Coach answers in `llmcaches` (key from `coachCacheKey`). Part of the LLM fallback chain, so
 * a database failure is logged at warn and treated as a miss / skipped write, never thrown.
 * Cached answers are re-validated on read; an entry that no longer matches the schema is a miss.
 */
export const createCoachCache = ({ Model = LlmCache, logger = defaultLogger } = {}) => ({
  get: async (key) => {
    try {
      const doc = await Model.findOne({ key }).lean();
      if (!doc) return null;
      return { answer: validateCoachResponse(doc.response), provider: doc.provider, model: doc.model };
    } catch (err) {
      logger.warn({ key, err: describeLlmError(err) }, 'LLM cache read failed, treated as a miss');
      return null;
    }
  },

  /** Only call with a schema-valid, sanitized answer. */
  set: async (key, { answer, provider, model }) => {
    try {
      await Model.updateOne({ key }, { $set: { provider, model, response: answer } }, { upsert: true });
    } catch (err) {
      logger.warn({ key, err: describeLlmError(err) }, 'LLM cache write failed');
    }
  },
});
