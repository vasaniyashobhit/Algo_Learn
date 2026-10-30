import { describe, expect, it } from 'vitest';
import { createCoachService } from '../../../../src/modules/llm/coach.service.js';
import { createLlmBreaker } from '../../../../src/modules/llm/helpers/chainSettings.js';
import { chainOptions, coachJson, fakeCache, fakeProvider, httpError } from '../../../helpers/llm.js';

const TEXT = 'Some problem statement.';

const service = (providers, overrides = {}) => {
  const options = chainOptions(overrides);
  return { ...options, coach: createCoachService({ providers, cache: fakeCache(), ...options }) };
};

describe('coach service (deadline and circuit breaker)', () => {
  it('returns AI_TIMEOUT and tries no other provider once the deadline passes', async () => {
    const a = fakeProvider('gemini', 'a', 'hang');
    const b = fakeProvider('gemini', 'b', coachJson());
    const { coach } = service([a, b], { timeoutMs: 5_000 });
    const result = await coach.getCoachAnswer({ text: TEXT, deadline: Date.now() + 20 });
    expect(result).toEqual({ answer: null, source: 'fallback', reason: 'AI_TIMEOUT' });
    expect(b.generateJson).not.toHaveBeenCalled();
  });

  it('defaults the deadline to now + deadlineMs', async () => {
    const a = fakeProvider('gemini', 'a', coachJson());
    const { coach } = service([a], { now: () => 1_000, deadlineMs: 0 });
    expect(await coach.getCoachAnswer({ text: TEXT })).toMatchObject({ reason: 'AI_TIMEOUT' });
    expect(a.generateJson).not.toHaveBeenCalled();
  });

  it('skips a model that answered 503 on the next request (circuit open)', async () => {
    const breaker = createLlmBreaker();
    const a = fakeProvider('gemini', 'a', httpError(503));
    const groq = fakeProvider('groq', 'g', coachJson());
    const { coach } = service([a, groq], { breaker });
    expect(await coach.getCoachAnswer({ text: TEXT })).toMatchObject({ provider: 'groq' });
    expect(await coach.getCoachAnswer({ text: `${TEXT} again` })).toMatchObject({ provider: 'groq' });
    expect(a.generateJson).toHaveBeenCalledTimes(1);
  });

  it('says AI_UNAVAILABLE when every circuit is open', async () => {
    const breaker = createLlmBreaker();
    breaker.trip('gemini:a');
    const a = fakeProvider('gemini', 'a', coachJson());
    expect(await service([a], { breaker }).coach.getCoachAnswer({ text: TEXT })).toMatchObject({ reason: 'AI_UNAVAILABLE' });
  });
});
