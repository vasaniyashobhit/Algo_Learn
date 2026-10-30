import { callProvider } from './helpers/callProvider.js';
import { chainSettings } from './helpers/chainSettings.js';
import { LlmError } from './helpers/llmError.js';

/**
 * `extractImageText(buffer, mimeType, { deadline })` → `{ text, provider, model }` or null. Tries
 * every provider that can read images (Gemini models) with the same retry/budget/breaker rules
 * as the coach, and stops once `deadline` (default now + LLM.deadlineMs) passes.
 * Never throws: null lets the caller fall back to OCR or ask the user for text.
 */
export const createImageTextExtractor = ({ providers, ...overrides }) => {
  const settings = chainSettings(overrides);
  const readers = providers.filter((provider) => typeof provider.extractTextFromImage === 'function');

  const extractImageText = async (buffer, mimeType, { deadline = settings.now() + settings.deadlineMs } = {}) => {
    if (!buffer?.length || !mimeType) return null;
    const call = async (provider, signal) => {
      const text = await provider.extractTextFromImage(buffer, mimeType, { signal });
      if (!text) throw new LlmError('The model found no text in the image', { reason: 'empty' });
      return text;
    };
    for (const provider of readers) {
      const { value, failed } = await callProvider(provider, call, { ...settings, deadline });
      if (value) return { text: value, provider: provider.name, model: provider.model };
      if (failed === 'timeout') return null;
    }
    return null;
  };

  return { extractImageText };
};
