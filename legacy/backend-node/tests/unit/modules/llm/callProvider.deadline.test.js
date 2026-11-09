import { describe, expect, it, vi } from 'vitest';
import { callProvider } from '../../../../src/modules/llm/helpers/callProvider.js';
import { createLlmBreaker } from '../../../../src/modules/llm/helpers/chainSettings.js';
import { chainOptions, httpError } from '../../../helpers/llm.js';

const provider = { name: 'gemini', model: 'm' };
const hang = (seen) => vi.fn((_p, signal) => new Promise((_r, reject) => {
  signal.addEventListener('abort', () => {
    seen.push(signal.reason.message);
    reject(signal.reason);
  });
}));

describe('callProvider (deadline and circuit breaker)', () => {
  it('does not call at all once the deadline has passed', async () => {
    const call = vi.fn();
    const now = () => 1_000;
    const opts = { ...chainOptions(), tries: 2, breaker: createLlmBreaker({ now }), now, deadline: 1_000 };
    expect(await callProvider(provider, call, opts)).toEqual({ failed: 'timeout' });
    expect(call).not.toHaveBeenCalled();
  });

  it('clamps the call timeout to the time left and does not trip the breaker for it', async () => {
    const seen = [];
    const now = () => 5_000;
    const breaker = createLlmBreaker({ now });
    const opts = { ...chainOptions({ timeoutMs: 25_000 }), tries: 2, breaker, now, deadline: 5_015 };
    expect(await callProvider(provider, hang(seen), opts)).toEqual({ failed: 'timeout' });
    expect(seen).toEqual(['Timed out after 15ms']);
    expect(breaker.isOpen('gemini:m')).toBe(false);
  });

  it('stops retrying when the deadline passes during the backoff', async () => {
    let clock = 0;
    const now = () => clock;
    const call = vi.fn(async () => { throw httpError(429); });
    const sleep = vi.fn(async (ms) => { clock += ms; });
    const opts = { ...chainOptions({ sleep }), tries: 2, backoffMs: 1000, breaker: createLlmBreaker({ now }), now, deadline: 500 };
    expect(await callProvider(provider, call, opts)).toEqual({ failed: 'timeout' });
    expect(call).toHaveBeenCalledTimes(1);
  });

  it('skips an open model for 2 minutes, then tries it again', async () => {
    let clock = 0;
    const now = () => clock;
    const breaker = createLlmBreaker({ now });
    breaker.trip('gemini:m');
    const call = vi.fn(async () => 'ok');
    const opts = () => ({ ...chainOptions(), tries: 2, breaker, now, deadline: clock + 40_000 });
    expect(await callProvider(provider, call, opts())).toEqual({ failed: 'open' });
    expect(call).not.toHaveBeenCalled();
    clock = 119_999;
    expect(await callProvider(provider, call, opts())).toEqual({ failed: 'open' });
    clock = 120_000;
    expect(await callProvider(provider, call, opts())).toEqual({ value: 'ok' });
  });
});
