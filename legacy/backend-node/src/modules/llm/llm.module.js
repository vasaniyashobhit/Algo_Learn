import { logger as defaultLogger } from '../../lib/logger.js';
import { createGeminiProviders } from './providers/gemini.provider.js';
import { createGroqProvider } from './providers/groq.provider.js';
import { createCoachCache } from './cache.js';
import { createCoachService } from './coach.service.js';
import { createImageTextExtractor } from './imageText.js';
import { createLlmBreaker, createLlmBudget } from './helpers/chainSettings.js';
import { chainOrder } from './helpers/chainOrder.js';

/** Providers from env in chain order: first Gemini model, Groq (when configured), other Gemini models. */
export const createLlmProviders = ({ env, ai, fetchImpl }) => chainOrder([
  ...createGeminiProviders({ apiKey: env.GEMINI_API_KEY, models: env.GEMINI_MODELS, ai }),
  createGroqProvider({ apiKey: env.GROQ_API_KEY, model: env.GROQ_MODEL, fetchImpl }),
].filter(Boolean));

/**
 * Wires the LLM module (no routes): `{ getCoachAnswer, extractImageText, providers }`.
 * Coach and image reading share one per-minute budget and one circuit breaker (one per process).
 */
export const createLlm = ({
  env,
  logger = defaultLogger,
  ai,
  fetchImpl,
  now = Date.now,
  cache = createCoachCache({ logger }),
  budget = createLlmBudget({ now }),
  breaker = createLlmBreaker({ now }),
  ...options
}) => {
  const providers = createLlmProviders({ env, ai, fetchImpl });
  const shared = { providers, budget, breaker, logger, now, ...options };
  return {
    providers,
    ...createCoachService({ ...shared, cache }),
    ...createImageTextExtractor(shared),
  };
};

const NO_CACHE = Object.freeze({ get: async () => null, set: async () => {} });

/**
 * LLM with no providers and no cache: the coach always returns the AI_UNAVAILABLE fallback and
 * image reading returns null. The default of createServices (tests, scripts); the server passes createLlm.
 */
export const createOfflineLlm = ({ logger = defaultLogger } = {}) =>
  createLlm({ env: { GEMINI_MODELS: [] }, ai: {}, cache: NO_CACHE, logger });
