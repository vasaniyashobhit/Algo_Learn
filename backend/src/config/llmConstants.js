/** LLM coach constants (Session 9), re-exported by constants.js: import them from there. */

/**
 * Fallback chain: each provider/model gets `tries` calls (backoff backoffMs · 2^(try−1), so
 * 1 s, 2 s, 4 s) of at most `timeoutMs` each. `budgetPerMinute` caps calls per provider model
 * (free tiers allow about 5–10/min on Gemini and 30/min on Groq). The rest bounds the answer.
 */
export const LLM = Object.freeze({
  tries: 3,
  backoffMs: 1_000,
  timeoutMs: 20_000,
  temperature: 0.2,
  budgetPerMinute: Object.freeze({ gemini: 8, groq: 25 }),
  defaultBudgetPerMinute: 5,
  maxTags: 8,
  maxHints: 3,
  maxSolutionSteps: 12,
  maxPitfalls: 8,
  maxItemLength: 500,
  maxTextLength: 4_000,
  maxCodeLength: 20_000,
  ratingMin: 800,
  ratingMax: 3500,
  ratingStep: 100,
});

/** `reason` of a `source: "fallback"` coach answer (no AI text available, never an error). */
export const LLM_FALLBACK_REASONS = Object.freeze({
  noInput: 'NO_INPUT',
  busy: 'AI_BUSY',
  unavailable: 'AI_UNAVAILABLE',
});
