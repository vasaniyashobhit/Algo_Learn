/** Domain constants shared by models, services and jobs. */

export const DAY_SECONDS = 24 * 60 * 60;

/** LLM answers expire from `llmcaches` after this many seconds (TTL index). */
export const LLM_CACHE_TTL_SECONDS = 30 * DAY_SECONDS;

/** Stuck-query raw input is truncated to this many characters before it is stored. */
export const STUCK_RAW_INPUT_MAX = 20_000;

/** Problem id: `<contestId>/<index>`, index 1-3 chars of A-Z/0-9 (e.g. 1/A, 1950/F2, 1723/GP1, 921/01). */
export const PROBLEM_ID_PATTERN = /^\d+\/[A-Z0-9]{1,3}$/;

export const PROBLEM_SOURCES = Object.freeze(['hf', 'cf_api']);
export const TOPIC_KINDS = Object.freeze(['single', 'pair']);
export const STUCK_INPUT_TYPES = Object.freeze(['text', 'url', 'pdf', 'image']);
export const TAG_SOURCES = Object.freeze(['db', 'ai', 'neighbors']);
export const ANSWER_SOURCES = Object.freeze(['ai', 'cache', 'fallback']);
export const GAP_STATUSES = Object.freeze(['untouched', 'weak', 'ok', 'strong']);
export const PRACTICE_STATUSES = Object.freeze(['todo', 'solved', 'skipped']);
export const PRACTICE_ORIGINS = Object.freeze(['recommendation', 'similar', 'stuck', 'manual']);

/** Every verdict the Codeforces API can return for a submission. */
export const CF_VERDICTS = Object.freeze([
  'FAILED',
  'OK',
  'PARTIAL',
  'COMPILATION_ERROR',
  'RUNTIME_ERROR',
  'WRONG_ANSWER',
  'PRESENTATION_ERROR',
  'TIME_LIMIT_EXCEEDED',
  'MEMORY_LIMIT_EXCEEDED',
  'IDLENESS_LIMIT_EXCEEDED',
  'SECURITY_VIOLATED',
  'CRASHED',
  'INPUT_PREPARATION_CRASHED',
  'CHALLENGED',
  'SKIPPED',
  'TESTING',
  'REJECTED',
]);
