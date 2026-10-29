import { logger as defaultLogger } from '../../lib/logger.js';
import { createGeminiProviders } from './providers/gemini.provider.js';
import { createGroqProvider } from './providers/groq.provider.js';
import { createCoachCache } from './cache.js';
import { createCoachService, createLlmBudget } from './coach.service.js';
import { createImageTextExtractor } from './imageText.js';

/** Ordered providers from env: every GEMINI_MODELS entry, then Groq when its key and model are set. */
export const createLlmProviders = ({ env, ai, fetchImpl }) => [
  ...createGeminiProviders({ apiKey: env.GEMINI_API_KEY, models: env.GEMINI_MODELS, ai }),
  createGroqProvider({ apiKey: env.GROQ_API_KEY, model: env.GROQ_MODEL, fetchImpl }),
].filter(Boolean);

/**
 * Wires the LLM module (no routes): `{ getCoachAnswer, extractImageText, providers }`.
 * Coach and image reading share one per-minute budget (one per process).
 */
export const createLlm = ({
  env,
  logger = defaultLogger,
  ai,
  fetchImpl,
  cache = createCoachCache({ logger }),
  budget = createLlmBudget(),
  ...options
}) => {
  const providers = createLlmProviders({ env, ai, fetchImpl });
  const shared = { providers, budget, logger, ...options };
  return {
    providers,
    ...createCoachService({ ...shared, cache }),
    ...createImageTextExtractor(shared),
  };
};
