import { withTimeout } from '../../../lib/withTimeout.js';
import { isRetryable } from './isRetryable.js';
import { describeLlmError } from './llmError.js';

export const budgetKey = ({ name, model }) => `${name}:${model}`;

/**
 * Calls one provider model with retries. Returns `{ value }` on success, `{ failed: 'busy' }`
 * when the per-minute budget is used up, or `{ failed: 'error' }`. Never throws: every failure is
 * logged at warn with the provider/model (the documented LLM-chain exception).
 * `call(provider, signal)` must return the final value or throw (invalid JSON throws too).
 */
export const callProvider = async (provider, call, {
  budget, logger, sleep, tries, backoffMs, timeoutMs,
}) => {
  const who = { provider: provider.name, model: provider.model };
  for (let attempt = 1; attempt <= tries; attempt += 1) {
    if (!budget.tryTake(budgetKey(provider))) {
      logger.warn({ ...who, attempt }, 'LLM per-minute budget used up, skipping to the next provider');
      return { failed: 'busy' };
    }
    try {
      return { value: await withTimeout((signal) => call(provider, signal), timeoutMs) };
    } catch (err) {
      const retry = attempt < tries && isRetryable(err);
      logger.warn({ ...who, attempt, retry, err: describeLlmError(err) }, 'LLM call failed');
      if (!retry) return { failed: 'error' };
      await sleep(backoffMs * 2 ** (attempt - 1));
    }
  }
  return { failed: 'error' };
};
