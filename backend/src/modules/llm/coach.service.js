import { LLM, LLM_FALLBACK_REASONS } from '../../config/constants.js';
import { createMinuteBudget } from '../../lib/minuteBudget.js';
import { defaultSleep } from '../../lib/retry.js';
import { logger as defaultLogger } from '../../lib/logger.js';
import { buildCoachPrompt } from './prompts/buildCoachPrompt.js';
import { parseCoachResponse } from './schema/coachResponse.schema.js';
import { coachCacheKey } from './helpers/cacheKey.js';
import { callProvider } from './helpers/callProvider.js';
import { describeLlmError } from './helpers/llmError.js';

/** Per-minute budget keyed by `name:model`, limits from LLM.budgetPerMinute by provider name. */
export const createLlmBudget = ({ limits = LLM.budgetPerMinute, now } = {}) => createMinuteBudget({
  limitFor: (key) => limits[key.split(':')[0]] ?? LLM.defaultBudgetPerMinute,
  now,
});

const fallback = (reason) => ({ answer: null, source: 'fallback', reason });

/**
 * `getCoachAnswer({ problemId, text, knownTags })` never throws. Order: cache → each provider in
 * `providers` order (Gemini models, then Groq) with retries → `{ answer: null, source: 'fallback' }`.
 * Only successful, schema-valid answers are cached.
 */
export const createCoachService = ({
  providers,
  cache,
  budget = createLlmBudget(),
  logger = defaultLogger,
  sleep = defaultSleep,
  tries = LLM.tries,
  backoffMs = LLM.backoffMs,
  timeoutMs = LLM.timeoutMs,
}) => {
  const options = { budget, logger, sleep, tries, backoffMs, timeoutMs };

  const askProviders = async (prompt) => {
    const call = async ({ generateJson }, signal) => parseCoachResponse(await generateJson({ prompt, signal }));
    const failures = [];
    for (const provider of providers) {
      const { value, failed } = await callProvider(provider, call, options);
      if (value) return { answer: value, provider: provider.name, model: provider.model };
      failures.push(failed);
    }
    const allBusy = failures.length > 0 && failures.every((failed) => failed === 'busy');
    return { reason: allBusy ? LLM_FALLBACK_REASONS.busy : LLM_FALLBACK_REASONS.unavailable };
  };

  const answer = async ({ problemId, text, knownTags = [] }) => {
    const key = coachCacheKey({ problemId, text });
    if (!key) return fallback(LLM_FALLBACK_REASONS.noInput);
    const hit = await cache.get(key);
    if (hit) return { ...hit, source: 'cache' };
    if (!String(text ?? '').trim()) return fallback(LLM_FALLBACK_REASONS.noInput);
    const result = await askProviders(buildCoachPrompt({ text, knownTags }));
    if (!result.answer) {
      logger.warn({ key, reason: result.reason }, 'Every LLM provider failed, using the fallback');
      return fallback(result.reason);
    }
    await cache.set(key, result);
    return { ...result, source: 'ai' };
  };

  const getCoachAnswer = async (input = {}) => {
    try {
      return await answer(input);
    } catch (err) {
      logger.error({ err: describeLlmError(err) }, 'Unexpected coach failure, using the fallback');
      return fallback(LLM_FALLBACK_REASONS.unavailable);
    }
  };

  return { getCoachAnswer };
};
