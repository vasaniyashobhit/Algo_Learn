export const defaultSleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Exponential backoff with "full jitter": a random delay in [0, min(maxMs, baseMs * factor^(n-1))]. */
export const computeDelay = ({ attempt, baseMs, maxMs, factor, random = Math.random }) => {
  const ceiling = Math.min(maxMs, baseMs * factor ** (attempt - 1));
  return Math.round(random() * ceiling);
};

/**
 * Runs `fn(attempt)` and retries up to `retries` extra times while `shouldRetry(err, attempt)`
 * is true. The last error is re-thrown unchanged (callers throw typed AppErrors).
 */
export const retry = async (fn, {
  retries = 3,
  baseMs = 200,
  maxMs = 5_000,
  factor = 2,
  shouldRetry = () => true,
  sleep = defaultSleep,
  random = Math.random,
  onRetry,
} = {}) => {
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await fn(attempt);
    } catch (err) {
      const canRetry = attempt <= retries && (await shouldRetry(err, attempt));
      if (!canRetry) throw err;
      const delayMs = computeDelay({ attempt, baseMs, maxMs, factor, random });
      onRetry?.({ err, attempt, delayMs });
      await sleep(delayMs);
    }
  }
};
