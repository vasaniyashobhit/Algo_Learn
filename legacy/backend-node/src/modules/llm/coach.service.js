import { LLM_FALLBACK_REASONS } from '../../config/constants.js';
import { buildCoachPrompt } from './prompts/buildCoachPrompt.js';
import { parseCoachResponse } from './schema/coachResponse.schema.js';
import { coachCacheKey } from './helpers/cacheKey.js';
import { callProvider } from './helpers/callProvider.js';
import { chainSettings } from './helpers/chainSettings.js';
import { describeLlmError } from './helpers/llmError.js';

export { createLlmBudget } from './helpers/chainSettings.js';

const fallback = (reason) => ({ answer: null, source: 'fallback', reason });

const reasonOf = (failures) => {
  if (failures.includes('timeout')) return LLM_FALLBACK_REASONS.timeout;
  const allBusy = failures.length > 0 && failures.every((failed) => failed === 'busy');
  return allBusy ? LLM_FALLBACK_REASONS.busy : LLM_FALLBACK_REASONS.unavailable;
};

/**
 * `getCoachAnswer({ problemId, text, knownTags, deadline })` never throws. Order: cache → each
 * provider in `providers` order → `{ answer: null, source: 'fallback', reason }`. `deadline`
 * (epoch ms, default now + LLM.deadlineMs) bounds the whole chain: once it passes, no other
 * provider is tried (reason AI_TIMEOUT). Only successful, schema-valid answers are cached.
 */
export const createCoachService = ({ providers, cache, ...overrides }) => {
  const settings = chainSettings(overrides);
  const { logger, now, deadlineMs } = settings;

  const askProviders = async (prompt, deadline) => {
    const call = async ({ generateJson }, signal) => parseCoachResponse(await generateJson({ prompt, signal }));
    const failures = [];
    for (const provider of providers) {
      const { value, failed } = await callProvider(provider, call, { ...settings, deadline });
      if (value) return { answer: value, provider: provider.name, model: provider.model };
      failures.push(failed);
      if (failed === 'timeout') break;
    }
    return { reason: reasonOf(failures) };
  };

  const answer = async ({ problemId, text, knownTags = [], deadline = now() + deadlineMs }) => {
    const key = coachCacheKey({ problemId, text });
    if (!key) return fallback(LLM_FALLBACK_REASONS.noInput);
    const hit = await cache.get(key);
    if (hit) return { ...hit, source: 'cache' };
    if (!String(text ?? '').trim()) return fallback(LLM_FALLBACK_REASONS.noInput);
    const result = await askProviders(buildCoachPrompt({ text, knownTags }), deadline);
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
