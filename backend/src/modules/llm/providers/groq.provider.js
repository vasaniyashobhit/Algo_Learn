import { LLM } from '../../../config/constants.js';
import { LlmError } from '../helpers/llmError.js';

export const GROQ_CHAT_URL = 'https://api.groq.com/openai/v1/chat/completions';

const SYSTEM = 'You are a competitive programming coach. Always answer with a single JSON object.';

/**
 * Groq's OpenAI-compatible chat/completions in JSON mode. Returns null (provider disabled) when
 * the key or the model is not configured. Non-2xx answers throw LlmError with the HTTP status.
 */
export const createGroqProvider = ({
  apiKey,
  model,
  fetchImpl = globalThis.fetch,
  temperature = LLM.temperature,
}) => {
  if (!apiKey || !model) return null;
  return {
    name: 'groq',
    model,
    generateJson: async ({ prompt, signal }) => {
      const response = await fetchImpl(GROQ_CHAT_URL, {
        method: 'POST',
        signal,
        headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
        body: JSON.stringify({
          model,
          temperature,
          response_format: { type: 'json_object' },
          messages: [{ role: 'system', content: SYSTEM }, { role: 'user', content: prompt }],
        }),
      });
      if (!response.ok) {
        throw new LlmError(`Groq answered HTTP ${response.status}`, { status: response.status });
      }
      const body = await response.json();
      return body?.choices?.[0]?.message?.content ?? '';
    },
  };
};
