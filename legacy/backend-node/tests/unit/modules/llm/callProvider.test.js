import { describe, expect, it, vi } from 'vitest';
import { budgetKey, callProvider } from '../../../../src/modules/llm/helpers/callProvider.js';
import { createLlmBreaker } from '../../../../src/modules/llm/helpers/chainSettings.js';
import { chainOptions, closedBudget, httpError } from '../../../helpers/llm.js';

const provider = { name: 'gemini', model: 'm' };
const options = (overrides = {}) => ({
  tries: 2, backoffMs: 1000, breaker: createLlmBreaker(), now: Date.now, deadline: Date.now() + 10_000,
  ...chainOptions(overrides), ...overrides,
});

describe('callProvider (retry rules)', () => {
  it('builds the budget key from name and model', () => {
    expect(budgetKey(provider)).toBe('gemini:m');
  });

  it('retries a 429 once after 1 s and takes one budget unit per try', async () => {
    const opts = options();
    const call = vi.fn().mockRejectedValueOnce(httpError(429)).mockResolvedValueOnce('ok');
    expect(await callProvider(provider, call, opts)).toEqual({ value: 'ok' });
    expect(opts.budget.tryTake).toHaveBeenCalledTimes(2);
    expect(opts.budget.tryTake).toHaveBeenCalledWith('gemini:m');
    expect(opts.sleep.mock.calls).toEqual([[1000]]);
  });

  it.each([500, 502, 504])('gives up after 2 tries on HTTP %i', async (status) => {
    const opts = options();
    const call = vi.fn(async () => { throw httpError(status); });
    expect(await callProvider(provider, call, opts)).toEqual({ failed: 'error' });
    expect(call).toHaveBeenCalledTimes(2);
    expect(opts.logger.warn).toHaveBeenLastCalledWith(
      expect.objectContaining({ provider: 'gemini', model: 'm', attempt: 2, retry: false }), 'LLM call failed');
  });

  it('does not retry a 503 "high demand" and opens the circuit', async () => {
    const opts = options();
    const call = vi.fn(async () => { throw httpError(503); });
    expect(await callProvider(provider, call, opts)).toEqual({ failed: 'error' });
    expect(call).toHaveBeenCalledTimes(1);
    expect(opts.sleep).not.toHaveBeenCalled();
    expect(opts.breaker.isOpen('gemini:m')).toBe(true);
  });

  it('does not retry a timeout and opens the circuit', async () => {
    const opts = options({ timeoutMs: 10 });
    const call = vi.fn((_p, signal) => new Promise((_r, reject) => signal.addEventListener('abort', () => reject(signal.reason))));
    expect(await callProvider(provider, call, opts)).toEqual({ failed: 'error' });
    expect(call).toHaveBeenCalledTimes(1);
    expect(opts.breaker.isOpen('gemini:m')).toBe(true);
  });

  it('does not retry (or trip on) a non-retryable error', async () => {
    const opts = options();
    const call = vi.fn(async () => { throw httpError(404); });
    expect(await callProvider(provider, call, opts)).toEqual({ failed: 'error' });
    expect(call).toHaveBeenCalledTimes(1);
    expect(opts.breaker.isOpen('gemini:m')).toBe(false);
  });

  it('reports busy without calling when the budget is used up', async () => {
    const call = vi.fn();
    const opts = options({ budget: closedBudget() });
    expect(await callProvider(provider, call, opts)).toEqual({ failed: 'busy' });
    expect(call).not.toHaveBeenCalled();
    expect(opts.logger.warn).toHaveBeenCalledWith(expect.objectContaining({ provider: 'gemini' }), expect.stringMatching(/budget/));
  });

  it('returns error when tries is 0 (nothing to do)', async () => {
    expect(await callProvider(provider, vi.fn(), options({ tries: 0 }))).toEqual({ failed: 'error' });
  });
});
