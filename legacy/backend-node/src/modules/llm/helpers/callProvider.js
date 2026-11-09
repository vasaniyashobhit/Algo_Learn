import { withTimeout } from '../../../lib/withTimeout.js';
import { failureKind } from './failureKind.js';
import { describeLlmError } from './llmError.js';

export const budgetKey = ({ name, model }) => `${name}:${model}`;

// The call timed out only because the deadline clamped its timeout, or the deadline has passed.
const cutByDeadline = (err, { limit, timeoutMs, deadline, now }) =>
  now() >= deadline || (limit < timeoutMs && err?.name === 'TimeoutError');

/**
 * Calls one provider model. Returns `{ value }` on success or `{ failed }`:
 * `open` (circuit open, not called), `busy` (minute budget used up), `timeout` (the chain's
 * `deadline` passed: stop the chain) or `error`. Each call gets min(timeoutMs, time left).
 * Only `retry` failures (429/500/502/504) are tried again after `backoffMs`; a timeout or 503
 * opens the model's circuit. Never throws: every failure is logged at warn (the documented
 * LLM-chain exception). `call(provider, signal)` must return the final value or throw.
 */
export const callProvider = async (provider, call, {
  budget, breaker, logger, sleep, tries, backoffMs, timeoutMs, deadline, now,
}) => {
  const who = { provider: provider.name, model: provider.model };
  const key = budgetKey(provider);
  if (breaker.isOpen(key)) {
    logger.warn(who, 'LLM model timed out or was overloaded recently, skipping it');
    return { failed: 'open' };
  }
  for (let attempt = 1; attempt <= tries; attempt += 1) {
    const left = deadline - now();
    if (left <= 0) return { failed: 'timeout' };
    if (!budget.tryTake(key)) {
      logger.warn({ ...who, attempt }, 'LLM per-minute budget used up, skipping to the next provider');
      return { failed: 'busy' };
    }
    const limit = Math.min(timeoutMs, left);
    try {
      return { value: await withTimeout((signal) => call(provider, signal), limit) };
    } catch (err) {
      if (cutByDeadline(err, { limit, timeoutMs, deadline, now })) {
        logger.warn({ ...who, attempt, err: describeLlmError(err) }, 'LLM chain deadline reached');
        return { failed: 'timeout' };
      }
      const kind = failureKind(err);
      if (kind === 'sick') breaker.trip(key);
      const retry = kind === 'retry' && attempt < tries;
      logger.warn({ ...who, attempt, retry, kind, err: describeLlmError(err) }, 'LLM call failed');
      if (!retry) return { failed: 'error' };
      await sleep(backoffMs);
    }
  }
  return { failed: 'error' };
};
