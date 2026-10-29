import { describe, expect, it, vi } from 'vitest';
import { budgetKey, callProvider } from '../../../../src/modules/llm/helpers/callProvider.js';
import { chainOptions, closedBudget, httpError } from '../../../helpers/llm.js';

const provider = { name: 'gemini', model: 'm' };
const options = (overrides = {}) => ({ tries: 3, backoffMs: 1000, ...chainOptions(overrides) });

describe('callProvider', () => {
  it('builds the budget key from name and model', () => {
    expect(budgetKey(provider)).toBe('gemini:m');
  });

  it('returns the value and takes one budget unit per try', async () => {
    const opts = options();
    const call = vi.fn().mockRejectedValueOnce(httpError(429)).mockResolvedValueOnce('ok');
    expect(await callProvider(provider, call, opts)).toEqual({ value: 'ok' });
    expect(opts.budget.tryTake).toHaveBeenCalledTimes(2);
    expect(opts.budget.tryTake).toHaveBeenCalledWith('gemini:m');
  });

  it('backs off 1 s, 2 s and gives up after 3 tries', async () => {
    const opts = options();
    const call = vi.fn(async () => { throw httpError(503); });
    expect(await callProvider(provider, call, opts)).toEqual({ failed: 'error' });
    expect(call).toHaveBeenCalledTimes(3);
    expect(opts.sleep.mock.calls.map(([ms]) => ms)).toEqual([1000, 2000]);
    expect(opts.logger.warn).toHaveBeenLastCalledWith(
      expect.objectContaining({ provider: 'gemini', model: 'm', attempt: 3, retry: false }), 'LLM call failed');
  });

  it('uses 4 s for a fourth try when configured', async () => {
    const opts = options({ tries: 4 });
    await callProvider(provider, async () => { throw httpError(503); }, opts);
    expect(opts.sleep.mock.calls.map(([ms]) => ms)).toEqual([1000, 2000, 4000]);
  });

  it('does not retry a non-retryable error', async () => {
    const call = vi.fn(async () => { throw httpError(404); });
    expect(await callProvider(provider, call, options())).toEqual({ failed: 'error' });
    expect(call).toHaveBeenCalledTimes(1);
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
