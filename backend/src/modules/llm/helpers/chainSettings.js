import { LLM } from '../../../config/constants.js';
import { createMinuteBudget } from '../../../lib/minuteBudget.js';
import { createCircuitBreaker } from '../../../lib/circuitBreaker.js';
import { defaultSleep } from '../../../lib/retry.js';
import { logger as defaultLogger } from '../../../lib/logger.js';

/** Per-minute budget keyed by `name:model`, limits from LLM.budgetPerMinute by provider name. */
export const createLlmBudget = ({ limits = LLM.budgetPerMinute, now } = {}) => createMinuteBudget({
  limitFor: (key) => limits[key.split(':')[0]] ?? LLM.defaultBudgetPerMinute,
  now,
});

/** Breaker keyed by `name:model`: a model that timed out or answered 503 is skipped for 2 min. */
export const createLlmBreaker = ({ openMs = LLM.circuitOpenMs, now } = {}) => createCircuitBreaker({ openMs, now });

/**
 * Chain settings shared by the coach and image reading, with defaults from LLM. The budget and
 * breaker are per process: createLlm passes the same instances to both.
 */
export const chainSettings = ({
  now = Date.now,
  budget = createLlmBudget({ now }),
  breaker = createLlmBreaker({ now }),
  logger = defaultLogger,
  sleep = defaultSleep,
  tries = LLM.tries,
  backoffMs = LLM.backoffMs,
  timeoutMs = LLM.timeoutMs,
  deadlineMs = LLM.deadlineMs,
} = {}) => ({ now, budget, breaker, logger, sleep, tries, backoffMs, timeoutMs, deadlineMs });
