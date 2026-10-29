import { vi } from 'vitest';
import { LlmError } from '../../src/modules/llm/helpers/llmError.js';

/** A raw model answer that passes the coach schema. */
export const coachJson = (overrides = {}) => JSON.stringify({
  tags: ['math', 'implementation'],
  estimatedRating: 1000,
  hints: ['Think about each side separately', 'Round up', 'Multiply the two counts'],
  approach: 'Count ceil(n/a) · ceil(m/a).',
  solutionSteps: ['Read n, m, a', 'Print the product'],
  complexity: 'O(1) time, O(1) memory',
  code: 'int main() {}',
  pitfalls: ['Use 64-bit integers'],
  ...overrides,
});

export const httpError = (status) => new LlmError(`HTTP ${status}`, { status });

/**
 * Fake provider. Each step is a string (returned), an Error (thrown) or 'hang' (waits for abort).
 * The last step repeats once the list is used up.
 */
export const fakeProvider = (name, model, ...steps) => {
  const queue = [...steps];
  const next = async (signal) => {
    const step = queue.length > 1 ? queue.shift() : queue[0];
    if (step === 'hang') {
      return new Promise((_resolve, reject) => signal.addEventListener('abort', () => reject(signal.reason)));
    }
    if (step instanceof Error) throw step;
    return step;
  };
  return {
    name,
    model,
    generateJson: vi.fn(({ signal }) => next(signal)),
    extractTextFromImage: vi.fn((_buffer, _mime, { signal }) => next(signal)),
  };
};

/** In-memory cache with the createCoachCache interface. */
export const fakeCache = (entries = {}) => {
  const store = new Map(Object.entries(entries));
  return {
    store,
    get: vi.fn(async (key) => store.get(key) ?? null),
    set: vi.fn(async (key, value) => {
      store.set(key, value);
    }),
  };
};

export const fakeLogger = () => ({ warn: vi.fn(), error: vi.fn(), info: vi.fn() });

/** A budget that always allows (or never allows) a call. */
export const openBudget = () => ({ tryTake: vi.fn(() => true) });
export const closedBudget = () => ({ tryTake: vi.fn(() => false) });

/** Shared options with no real waiting; `sleep` records the backoff delays. */
export const chainOptions = (overrides = {}) => ({
  budget: openBudget(),
  logger: fakeLogger(),
  sleep: vi.fn(async () => {}),
  timeoutMs: 50,
  ...overrides,
});
