import { LLM } from '../../config/constants.js';
import { defaultSleep } from '../../lib/retry.js';
import { logger as defaultLogger } from '../../lib/logger.js';
import { callProvider } from './helpers/callProvider.js';
import { LlmError } from './helpers/llmError.js';

/**
 * `extractImageText(buffer, mimeType)` → `{ text, provider, model }` or null. Tries every
 * provider that can read images (Gemini models) with the same retry/budget rules as the coach.
 * Never throws: null lets the caller fall back to OCR or ask the user for text.
 */
export const createImageTextExtractor = ({
  providers,
  budget,
  logger = defaultLogger,
  sleep = defaultSleep,
  tries = LLM.tries,
  backoffMs = LLM.backoffMs,
  timeoutMs = LLM.timeoutMs,
}) => {
  const readers = providers.filter((provider) => typeof provider.extractTextFromImage === 'function');
  const options = { budget, logger, sleep, tries, backoffMs, timeoutMs };

  const extractImageText = async (buffer, mimeType) => {
    if (!buffer?.length || !mimeType) return null;
    const call = async (provider, signal) => {
      const text = await provider.extractTextFromImage(buffer, mimeType, { signal });
      if (!text) throw new LlmError('The model found no text in the image', { reason: 'empty' });
      return text;
    };
    for (const provider of readers) {
      const { value } = await callProvider(provider, call, options);
      if (value) return { text: value, provider: provider.name, model: provider.model };
    }
    return null;
  };

  return { extractImageText };
};
