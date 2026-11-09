/** Error thrown by withTimeout (name `TimeoutError`, like AbortSignal.timeout). */
export const timeoutError = (ms) => Object.assign(new Error(`Timed out after ${ms}ms`), { name: 'TimeoutError' });

/**
 * Runs `fn(signal)` and rejects with a TimeoutError after `ms`, aborting `signal` too, even if
 * `fn` ignores the signal. The timer is always cleared.
 */
export const withTimeout = async (fn, ms) => {
  const controller = new AbortController();
  let timer;
  const expired = new Promise((_resolve, reject) => {
    timer = setTimeout(() => {
      const err = timeoutError(ms);
      controller.abort(err);
      reject(err);
    }, ms);
  });
  try {
    return await Promise.race([fn(controller.signal), expired]);
  } finally {
    clearTimeout(timer);
  }
};
