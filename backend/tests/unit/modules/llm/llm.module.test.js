import { describe, expect, it, vi } from 'vitest';
import { createLlm, createLlmProviders } from '../../../../src/modules/llm/llm.module.js';
import { coachJson, fakeCache, fakeLogger } from '../../../helpers/llm.js';

const env = (overrides = {}) => ({ GEMINI_API_KEY: 'k', GEMINI_MODELS: ['a', 'b'], ...overrides });
const fakeAi = () => ({ models: { generateContent: vi.fn(async () => ({ text: coachJson() })) } });

describe('llm module wiring', () => {
  it('orders Gemini models first and leaves Groq out without a key', () => {
    expect(createLlmProviders({ env: env(), ai: fakeAi() }).map((p) => `${p.name}:${p.model}`))
      .toEqual(['gemini:a', 'gemini:b']);
  });

  it('adds Groq last when key and model are set', () => {
    const providers = createLlmProviders({ env: env({ GROQ_API_KEY: 'g', GROQ_MODEL: 'llama' }), ai: fakeAi() });
    expect(providers.at(-1)).toMatchObject({ name: 'groq', model: 'llama' });
  });

  it('exposes getCoachAnswer and extractImageText over the same providers', async () => {
    const ai = fakeAi();
    const llm = createLlm({ env: env(), ai, cache: fakeCache(), logger: fakeLogger() });
    expect(await llm.getCoachAnswer({ text: 'problem' })).toMatchObject({ source: 'ai', provider: 'gemini', model: 'a' });
    expect(await llm.extractImageText(Buffer.from('x'), 'image/png')).toMatchObject({ model: 'a' });
    expect(ai.models.generateContent).toHaveBeenCalledTimes(2);
  });
});
