import { GoogleGenAI } from '@google/genai';
import { LLM } from '../../../config/constants.js';

const IMAGE_PROMPT = [
  'This image is a screenshot of a competitive programming problem.',
  'Transcribe all of its text exactly (statement, input, output, examples, notes).',
  'Write formulas in plain text. Reply with the text only, nothing else.',
].join(' ');

/**
 * One Gemini model behind the provider interface `{ name, model, generateJson, extractTextFromImage }`.
 * `ai` is a shared `GoogleGenAI` client (injected in tests). Errors are the SDK's own
 * (`ApiError` has `status`); the coach chain decides what to do with them.
 */
export const createGeminiProvider = ({ ai, model, temperature = LLM.temperature }) => ({
  name: 'gemini',
  model,
  generateJson: async ({ prompt, signal }) => {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: { responseMimeType: 'application/json', temperature, abortSignal: signal },
    });
    return response.text ?? '';
  },
  extractTextFromImage: async (buffer, mimeType, { signal } = {}) => {
    const response = await ai.models.generateContent({
      model,
      contents: [
        { inlineData: { mimeType, data: Buffer.from(buffer).toString('base64') } },
        { text: IMAGE_PROMPT },
      ],
      config: { temperature: 0, abortSignal: signal },
    });
    return (response.text ?? '').trim();
  },
});

/** One provider per model in GEMINI_MODELS order, all sharing one client. */
export const createGeminiProviders = ({ apiKey, models, ai = new GoogleGenAI({ apiKey }) }) =>
  models.map((model) => createGeminiProvider({ ai, model }));
