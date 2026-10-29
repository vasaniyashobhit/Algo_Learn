import { describe, expect, it, vi } from 'vitest';
import { createGeminiProviders } from '../../../../src/modules/llm/providers/gemini.provider.js';
import { GROQ_CHAT_URL, createGroqProvider } from '../../../../src/modules/llm/providers/groq.provider.js';

const fakeAi = (text) => ({ models: { generateContent: vi.fn(async () => ({ text })) } });

describe('gemini provider', () => {
  it('makes one provider per model sharing the client', () => {
    const ai = fakeAi('{}');
    expect(createGeminiProviders({ apiKey: 'k', models: ['a', 'b'], ai }).map((p) => [p.name, p.model]))
      .toEqual([['gemini', 'a'], ['gemini', 'b']]);
  });

  it('asks for application/json and passes the abort signal', async () => {
    const ai = fakeAi('{"ok":1}');
    const [provider] = createGeminiProviders({ apiKey: 'k', models: ['m'], ai });
    const signal = new AbortController().signal;
    expect(await provider.generateJson({ prompt: 'P', signal })).toBe('{"ok":1}');
    expect(ai.models.generateContent).toHaveBeenCalledWith({
      model: 'm', contents: 'P', config: { responseMimeType: 'application/json', temperature: 0.2, abortSignal: signal },
    });
  });

  it('returns an empty string when the model sends no text', async () => {
    const [provider] = createGeminiProviders({ apiKey: 'k', models: ['m'], ai: fakeAi(undefined) });
    expect(await provider.generateJson({ prompt: 'P' })).toBe('');
    expect(await provider.extractTextFromImage(Buffer.from('x'), 'image/png')).toBe('');
  });

  it('sends a screenshot as base64 inline data and trims the text', async () => {
    const ai = fakeAi('  A. Theatre Square \n');
    const [provider] = createGeminiProviders({ apiKey: 'k', models: ['m'], ai });
    expect(await provider.extractTextFromImage(Buffer.from('png-bytes'), 'image/png')).toBe('A. Theatre Square');
    const [{ contents, config }] = ai.models.generateContent.mock.calls[0];
    expect(contents[0]).toEqual({ inlineData: { mimeType: 'image/png', data: Buffer.from('png-bytes').toString('base64') } });
    expect(contents[1].text).toMatch(/Transcribe all of its text/);
    expect(config.temperature).toBe(0);
  });

  it('lets SDK errors through for the chain to handle', async () => {
    const ai = { models: { generateContent: vi.fn(async () => { throw Object.assign(new Error('x'), { status: 429 }); }) } };
    const [provider] = createGeminiProviders({ apiKey: 'k', models: ['m'], ai });
    await expect(provider.generateJson({ prompt: 'P' })).rejects.toMatchObject({ status: 429 });
  });
});

describe('groq provider', () => {
  const json = (body, status = 200) => new Response(JSON.stringify(body), { status });

  it('is disabled without a key or a model', () => {
    expect(createGroqProvider({ apiKey: undefined, model: 'm' })).toBeNull();
    expect(createGroqProvider({ apiKey: 'k', model: undefined })).toBeNull();
  });

  it('posts a JSON-mode chat completion and returns the content', async () => {
    const fetchImpl = vi.fn(async () => json({ choices: [{ message: { content: '{"a":1}' } }] }));
    const provider = createGroqProvider({ apiKey: 'secret', model: 'llama', fetchImpl });
    expect(provider).toMatchObject({ name: 'groq', model: 'llama' });
    expect(await provider.generateJson({ prompt: 'P' })).toBe('{"a":1}');
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe(GROQ_CHAT_URL);
    expect(init.headers.authorization).toBe('Bearer secret');
    const body = JSON.parse(init.body);
    expect(body).toMatchObject({ model: 'llama', response_format: { type: 'json_object' } });
    expect(body.messages.at(-1)).toEqual({ role: 'user', content: 'P' });
  });

  it('throws an LlmError with the HTTP status on non-2xx', async () => {
    const provider = createGroqProvider({ apiKey: 'k', model: 'm', fetchImpl: async () => json({}, 429) });
    await expect(provider.generateJson({ prompt: 'P' })).rejects.toMatchObject({ name: 'LlmError', status: 429 });
  });

  it('returns an empty string when there is no choice', async () => {
    const provider = createGroqProvider({ apiKey: 'k', model: 'm', fetchImpl: async () => json({ choices: [] }) });
    expect(await provider.generateJson({ prompt: 'P' })).toBe('');
  });
});
