import { describe, expect, it } from 'vitest';
import { createCoachService } from '../../../../src/modules/llm/coach.service.js';
import { chainOptions, coachJson, fakeCache, fakeProvider, httpError } from '../../../helpers/llm.js';

const TEXT = 'Theatre Square: cover an n × m square with a × a flagstones.';

const service = (providers, overrides = {}) => {
  const options = chainOptions(overrides);
  const cache = overrides.cache ?? fakeCache();
  return { ...options, cache, coach: createCoachService({ providers, cache, ...options }) };
};

describe('coach service (success paths)', () => {
  it('returns a cache hit without calling any provider', async () => {
    const gemini = fakeProvider('gemini', 'a', coachJson());
    const cached = { answer: { hints: ['x'] }, provider: 'gemini', model: 'old' };
    const { coach } = service([gemini], { cache: fakeCache({ 'problem:1/A': cached }) });
    const result = await coach.getCoachAnswer({ problemId: '1/A', text: TEXT });
    expect(result).toEqual({ ...cached, source: 'cache' });
    expect(gemini.generateJson).not.toHaveBeenCalled();
  });

  it('answers from the first model and caches the sanitized answer', async () => {
    const gemini = fakeProvider('gemini', 'a', coachJson({ tags: ['dp', 'not-a-tag'] }));
    const { coach, cache } = service([gemini, fakeProvider('gemini', 'b', coachJson())]);
    const result = await coach.getCoachAnswer({ problemId: '1/A', text: TEXT, knownTags: ['math'] });
    expect(result).toMatchObject({ source: 'ai', provider: 'gemini', model: 'a' });
    expect(result.answer.tags).toEqual(['dp']);
    expect(cache.set).toHaveBeenCalledWith('problem:1/A', { answer: result.answer, provider: 'gemini', model: 'a' });
    expect(gemini.generateJson.mock.calls[0][0].prompt).toContain('Known tags for this problem: math');
  });

  it('retries a 429 once after 1 s, then succeeds', async () => {
    const gemini = fakeProvider('gemini', 'a', httpError(429), coachJson());
    const { coach, sleep, logger } = service([gemini]);
    const result = await coach.getCoachAnswer({ text: TEXT });
    expect(result).toMatchObject({ source: 'ai', model: 'a' });
    expect(gemini.generateJson).toHaveBeenCalledTimes(2);
    expect(sleep.mock.calls.map(([ms]) => ms)).toEqual([1000]);
    expect(logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({ provider: 'gemini', model: 'a', attempt: 1, retry: true }), 'LLM call failed');
  });

  it('moves to model B when model A is exhausted after 2 tries', async () => {
    const a = fakeProvider('gemini', 'a', httpError(429));
    const b = fakeProvider('gemini', 'b', coachJson());
    const result = await service([a, b]).coach.getCoachAnswer({ text: TEXT });
    expect(result).toMatchObject({ source: 'ai', provider: 'gemini', model: 'b' });
    expect(a.generateJson).toHaveBeenCalledTimes(2);
  });

  it('falls through to Groq when every Gemini model fails', async () => {
    const a = fakeProvider('gemini', 'a', httpError(503));
    const b = fakeProvider('gemini', 'b', httpError(404));
    const groq = fakeProvider('groq', 'llama', coachJson());
    const result = await service([a, b, groq]).coach.getCoachAnswer({ text: TEXT });
    expect(result).toMatchObject({ source: 'ai', provider: 'groq', model: 'llama' });
    expect(b.generateJson).toHaveBeenCalledTimes(1);
  });

  it('moves on at once (no retry) when a model hangs past the timeout', async () => {
    const a = fakeProvider('gemini', 'a', 'hang', coachJson());
    const b = fakeProvider('gemini', 'b', coachJson());
    const result = await service([a, b], { timeoutMs: 10 }).coach.getCoachAnswer({ text: TEXT });
    expect(result).toMatchObject({ source: 'ai', model: 'b' });
    expect(a.generateJson).toHaveBeenCalledTimes(1);
  });

  it('keys free text by its normalized hash, so whitespace changes hit the cache', async () => {
    const gemini = fakeProvider('gemini', 'a', coachJson());
    const { coach } = service([gemini]);
    await coach.getCoachAnswer({ text: TEXT });
    const second = await coach.getCoachAnswer({ text: `  ${TEXT.replaceAll(' ', '\n  ')}\r\n` });
    expect(second.source).toBe('cache');
    expect(gemini.generateJson).toHaveBeenCalledTimes(1);
  });
});
