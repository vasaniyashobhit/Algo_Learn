import { afterEach, describe, expect, it, vi } from 'vitest';
import { createRateLimitQueue } from '../../../src/lib/rateLimitQueue.js';

/** A fake clock whose sleep advances time instantly and records each wait. */
const fakeClock = () => {
  let time = 1_000;
  const waits = [];
  return {
    now: () => time,
    sleep: async (ms) => {
      waits.push(ms);
      time += ms;
    },
    waits,
  };
};

describe('createRateLimitQueue', () => {
  afterEach(() => vi.useRealTimers());

  it('validates intervalMs', () => {
    expect(() => createRateLimitQueue({ intervalMs: -1 })).toThrow(TypeError);
    expect(() => createRateLimitQueue()).toThrow(TypeError);
  });

  it('runs the first task immediately and spaces the next ones by intervalMs', async () => {
    const clock = fakeClock();
    const limit = createRateLimitQueue({ intervalMs: 2_100, ...clock });
    const starts = [];
    const task = (n) => async () => {
      starts.push(clock.now());
      return n;
    };
    expect(await Promise.all([1, 2, 3].map((n) => limit(task(n))))).toEqual([1, 2, 3]);
    expect(starts).toEqual([1_000, 3_100, 5_200]);
    expect(clock.waits).toEqual([2_100, 2_100]);
  });

  it('starts tasks in call order even when earlier tasks are slow', async () => {
    const clock = fakeClock();
    const limit = createRateLimitQueue({ intervalMs: 10, ...clock });
    const order = [];
    await Promise.all(['a', 'b', 'c'].map((name) => limit(async () => order.push(name))));
    expect(order).toEqual(['a', 'b', 'c']);
  });

  it('does not wait when enough time has already passed', async () => {
    const clock = fakeClock();
    const limit = createRateLimitQueue({ intervalMs: 100, ...clock });
    await limit(async () => {});
    await clock.sleep(500);
    clock.waits.length = 0;
    await limit(async () => {});
    expect(clock.waits).toEqual([]);
  });

  it('propagates task errors to the caller without blocking later tasks', async () => {
    const clock = fakeClock();
    const limit = createRateLimitQueue({ intervalMs: 50, ...clock });
    const failing = limit(async () => {
      throw new Error('boom');
    });
    const next = limit(async () => 'still runs');
    await expect(failing).rejects.toThrow('boom');
    expect(await next).toBe('still runs');
    expect(clock.waits).toEqual([50]);
  });

  it('uses real timers by default', async () => {
    vi.useFakeTimers();
    const limit = createRateLimitQueue({ intervalMs: 2_100 });
    const second = vi.fn(async () => 'second');
    await limit(async () => 'first');
    const pending = limit(second);
    await vi.advanceTimersByTimeAsync(2_000);
    expect(second).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(100);
    expect(await pending).toBe('second');
  });
});
