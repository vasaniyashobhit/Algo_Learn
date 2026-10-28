import { afterEach, describe, expect, it, vi } from 'vitest';
import { computeDelay, defaultSleep, retry } from '../../../src/lib/retry.js';

const failTimes = (n, value = 'ok') => {
  let calls = 0;
  return vi.fn(async () => {
    calls += 1;
    if (calls <= n) throw new Error(`fail ${calls}`);
    return value;
  });
};

describe('computeDelay', () => {
  const base = { baseMs: 100, maxMs: 1_000, factor: 2 };

  it('grows exponentially and is capped at maxMs', () => {
    const max = () => 1;
    expect([1, 2, 3, 4, 5].map((attempt) => computeDelay({ ...base, attempt, random: max })))
      .toEqual([100, 200, 400, 800, 1_000]);
  });

  it('applies full jitter between 0 and the ceiling', () => {
    expect(computeDelay({ ...base, attempt: 3, random: () => 0 })).toBe(0);
    expect(computeDelay({ ...base, attempt: 3, random: () => 0.5 })).toBe(200);
  });
});

describe('retry', () => {
  afterEach(() => vi.useRealTimers());

  it('returns immediately on success without sleeping', async () => {
    const sleep = vi.fn();
    expect(await retry(async () => 42, { sleep })).toBe(42);
    expect(sleep).not.toHaveBeenCalled();
  });

  it('retries until success with backoff delays and passes the attempt number', async () => {
    const fn = failTimes(2);
    const sleep = vi.fn(async () => {});
    const onRetry = vi.fn();
    const result = await retry(fn, { sleep, onRetry, baseMs: 100, random: () => 1 });
    expect(result).toBe('ok');
    expect(fn.mock.calls.map(([attempt]) => attempt)).toEqual([1, 2, 3]);
    expect(sleep.mock.calls).toEqual([[100], [200]]);
    expect(onRetry).toHaveBeenCalledWith(expect.objectContaining({ attempt: 1, delayMs: 100 }));
  });

  it('re-throws the last error after exhausting retries', async () => {
    const fn = failTimes(10);
    await expect(retry(fn, { retries: 2, sleep: async () => {} })).rejects.toThrow('fail 3');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('stops early when shouldRetry returns false', async () => {
    const fn = failTimes(10);
    const shouldRetry = vi.fn(async (_err, attempt) => attempt < 2);
    await expect(retry(fn, { shouldRetry, sleep: async () => {} })).rejects.toThrow('fail 2');
    expect(shouldRetry).toHaveBeenLastCalledWith(expect.any(Error), 2);
  });

  it('uses real timers by default (verified with fake timers)', async () => {
    vi.useFakeTimers();
    const fn = failTimes(1);
    const pending = retry(fn, { baseMs: 500, random: () => 1 });
    await vi.advanceTimersByTimeAsync(499);
    expect(fn).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(await pending).toBe('ok');
  });

  it('defaultSleep resolves after the given time', async () => {
    vi.useFakeTimers();
    const done = vi.fn();
    const pending = defaultSleep(1_000).finally(done);
    await vi.advanceTimersByTimeAsync(1_000);
    await pending;
    expect(done).toHaveBeenCalled();
  });
});
