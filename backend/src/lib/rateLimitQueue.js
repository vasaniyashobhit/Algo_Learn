import { defaultSleep } from './retry.js';

/**
 * Creates a FIFO limiter: `limit(task)` starts tasks in call order, at least `intervalMs`
 * apart (start to start). It resolves/rejects with the task's own result; a failing task
 * never blocks the ones queued after it.
 */
export const createRateLimitQueue = ({ intervalMs, now = Date.now, sleep = defaultSleep } = {}) => {
  if (!Number.isFinite(intervalMs) || intervalMs < 0) {
    throw new TypeError('intervalMs must be a non-negative number');
  }
  let gate = Promise.resolve();
  let nextStartAt = 0;

  return async (task) => {
    const previous = gate;
    let release;
    gate = new Promise((resolve) => {
      release = resolve;
    });
    try {
      await previous;
      const waitMs = nextStartAt - now();
      if (waitMs > 0) await sleep(waitMs);
      nextStartAt = now() + intervalMs;
    } finally {
      release();
    }
    return task();
  };
};
