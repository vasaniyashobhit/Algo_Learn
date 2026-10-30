import { describe, expect, it, vi } from 'vitest';
import { createCoachService, createLlmBudget } from '../../../../src/modules/llm/coach.service.js';
import {
  chainOptions, closedBudget, coachJson, fakeCache, fakeProvider, httpError,
} from '../../../helpers/llm.js';

const TEXT = 'Some problem statement.';

const service = (providers, overrides = {}) => {
  const options = chainOptions(overrides);
  const cache = overrides.cache ?? fakeCache();
  return { ...options, cache, coach: createCoachService({ providers, cache, ...options }) };
};

describe('coach service (failure paths)', () => {
  it('returns the fallback (never throws) when every provider fails', async () => {
    const providers = [fakeProvider('gemini', 'a', httpError(500)), fakeProvider('groq', 'g', new TypeError('fetch failed'))];
    const { coach, cache, logger } = service(providers);
    const result = await coach.getCoachAnswer({ problemId: '1/A', text: TEXT });
    expect(result).toEqual({ answer: null, source: 'fallback', reason: 'AI_UNAVAILABLE' });
    expect(cache.set).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledWith(expect.objectContaining({ provider: 'groq', model: 'g' }), 'LLM call failed');
  });

  it('treats invalid JSON as a failure of that model (no retry, not cached)', async () => {
    const a = fakeProvider('gemini', 'a', 'Sure! Here is the answer: {');
    const b = fakeProvider('gemini', 'b', coachJson());
    const { coach, logger } = service([a, b]);
    expect(await coach.getCoachAnswer({ text: TEXT })).toMatchObject({ source: 'ai', model: 'b' });
    expect(a.generateJson).toHaveBeenCalledTimes(1);
    expect(logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({ model: 'a', err: expect.objectContaining({ reason: 'invalid_json' }) }), 'LLM call failed');
  });

  it('treats JSON that misses the schema as a failure', async () => {
    const a = fakeProvider('gemini', 'a', JSON.stringify({ tags: ['dp'] }));
    expect(await service([a]).coach.getCoachAnswer({ text: TEXT })).toMatchObject({ source: 'fallback' });
  });

  it('skips a provider whose minute budget is used up and says AI_BUSY when all are', async () => {
    const a = fakeProvider('gemini', 'a', coachJson());
    const result = await service([a], { budget: closedBudget() }).coach.getCoachAnswer({ text: TEXT });
    expect(result).toEqual({ answer: null, source: 'fallback', reason: 'AI_BUSY' });
    expect(a.generateJson).not.toHaveBeenCalled();
  });

  it('goes straight to the next provider once the budget runs out mid-retry', async () => {
    let now = 0;
    const budget = createLlmBudget({ limits: { gemini: 1, groq: 5 }, now: () => now });
    const a = fakeProvider('gemini', 'a', httpError(429));
    const groq = fakeProvider('groq', 'g', coachJson());
    const result = await service([a, groq], { budget }).coach.getCoachAnswer({ text: TEXT });
    expect(result).toMatchObject({ provider: 'groq' });
    expect(a.generateJson).toHaveBeenCalledTimes(1);
    now = 60_000;
    expect(budget.tryTake('gemini:a')).toBe(true);
  });

  it('returns NO_INPUT without calling providers for empty input', async () => {
    const a = fakeProvider('gemini', 'a', coachJson());
    const { coach } = service([a]);
    expect(await coach.getCoachAnswer({ text: '  \n ' })).toMatchObject({ reason: 'NO_INPUT' });
    expect(await coach.getCoachAnswer({ problemId: '1/A' })).toMatchObject({ reason: 'NO_INPUT' });
    expect(await coach.getCoachAnswer()).toMatchObject({ reason: 'NO_INPUT' });
    expect(a.generateJson).not.toHaveBeenCalled();
  });

  it('turns an unexpected internal error into the fallback and logs it', async () => {
    const cache = { get: vi.fn(async () => { throw new Error('boom'); }), set: vi.fn() };
    const { coach, logger } = service([], { cache });
    expect(await coach.getCoachAnswer({ text: TEXT })).toMatchObject({ source: 'fallback', reason: 'AI_UNAVAILABLE' });
    expect(logger.error).toHaveBeenCalled();
  });

  it('says AI_UNAVAILABLE when no provider is configured', async () => {
    expect(await service([]).coach.getCoachAnswer({ text: TEXT })).toMatchObject({ reason: 'AI_UNAVAILABLE' });
  });
});
