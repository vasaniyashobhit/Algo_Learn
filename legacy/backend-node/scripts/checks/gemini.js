import { GoogleGenAI } from '@google/genai';
import { parseEnv } from '../../src/config/env.js';

// Prints model name and OK / error code only, never the key.
const { GEMINI_API_KEY, GEMINI_MODELS } = parseEnv();
const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY, httpOptions: { timeout: 30_000 } });
for (const model of GEMINI_MODELS) {
  const started = Date.now();
  try {
    const res = await ai.models.generateContent({ model, contents: 'Reply with OK' });
    console.log(model, 'OK', JSON.stringify(res.text?.trim().slice(0, 20)), `${Date.now() - started}ms`);
  } catch (err) {
    console.log(model, 'ERROR', err.status ?? err.code ?? err.name, String(err.message).match(/"message":"([^"]*)"/)?.[1] ?? String(err.message).slice(0, 200));
  }
}
