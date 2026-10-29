import { describe, expect, it } from 'vitest';
import { createImageTextExtractor } from '../../../../src/modules/llm/imageText.js';
import { chainOptions, closedBudget, fakeProvider, httpError } from '../../../helpers/llm.js';

const PNG = Buffer.from('fake-png');

const extractor = (providers, overrides = {}) => {
  const options = chainOptions(overrides);
  return { ...options, ...createImageTextExtractor({ providers, ...options }) };
};

describe('image text extraction wrapper', () => {
  it('returns the text and the model that read it', async () => {
    const gemini = fakeProvider('gemini', 'a', 'A. Theatre Square');
    const { extractImageText } = extractor([gemini]);
    expect(await extractImageText(PNG, 'image/png')).toEqual({ text: 'A. Theatre Square', provider: 'gemini', model: 'a' });
    expect(gemini.extractTextFromImage).toHaveBeenCalledWith(PNG, 'image/png', { signal: expect.any(AbortSignal) });
  });

  it('retries a 503, then moves to the next model', async () => {
    const a = fakeProvider('gemini', 'a', httpError(503));
    const b = fakeProvider('gemini', 'b', 'text');
    const { extractImageText, sleep } = extractor([a, b]);
    expect(await extractImageText(PNG, 'image/png')).toMatchObject({ model: 'b' });
    expect(a.extractTextFromImage).toHaveBeenCalledTimes(3);
    expect(sleep.mock.calls.map(([ms]) => ms)).toEqual([1000, 2000]);
  });

  it('treats an empty transcription as a failure', async () => {
    const a = fakeProvider('gemini', 'a', '');
    const b = fakeProvider('gemini', 'b', 'text');
    expect(await extractor([a, b]).extractImageText(PNG, 'image/png')).toMatchObject({ model: 'b' });
    expect(a.extractTextFromImage).toHaveBeenCalledTimes(1);
  });

  it('skips providers that cannot read images (Groq)', async () => {
    const groq = { name: 'groq', model: 'g', generateJson: async () => '{}' };
    expect(await extractor([groq]).extractImageText(PNG, 'image/png')).toBeNull();
  });

  it('returns null (never throws) when every model fails or the budget is used up', async () => {
    expect(await extractor([fakeProvider('gemini', 'a', httpError(400))]).extractImageText(PNG, 'image/png')).toBeNull();
    const busy = extractor([fakeProvider('gemini', 'a', 'x')], { budget: closedBudget() });
    expect(await busy.extractImageText(PNG, 'image/png')).toBeNull();
  });

  it('returns null for an empty buffer or a missing mime type', async () => {
    const gemini = fakeProvider('gemini', 'a', 'x');
    const { extractImageText } = extractor([gemini]);
    expect(await extractImageText(Buffer.alloc(0), 'image/png')).toBeNull();
    expect(await extractImageText(PNG, '')).toBeNull();
    expect(await extractImageText(undefined, 'image/png')).toBeNull();
    expect(gemini.extractTextFromImage).not.toHaveBeenCalled();
  });
});
