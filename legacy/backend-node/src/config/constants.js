/** Domain constants shared by models, services and jobs. */

export const DAY_SECONDS = 24 * 60 * 60;

/** LLM answers expire from `llmcaches` after this many seconds (TTL index). */
export const LLM_CACHE_TTL_SECONDS = 30 * DAY_SECONDS;

/** Stuck-query raw input is truncated to this many characters before it is stored. */
export const STUCK_RAW_INPUT_MAX = 20_000;

const INDEX_SOURCE = '[A-Z0-9]{1,3}';

/** Problem index: 1-3 chars of A-Z/0-9 (e.g. A, F2, GP1, 01). */
export const PROBLEM_INDEX_PATTERN = new RegExp(`^${INDEX_SOURCE}$`);

/** Contest id in a route param: a positive integer without leading zeros. */
export const CONTEST_ID_PATTERN = /^[1-9]\d{0,6}$/;

/** Problem id: `<contestId>/<index>` (e.g. 1/A, 1950/F2, 1723/GP1, 921/01). */
export const PROBLEM_ID_PATTERN = new RegExp(String.raw`^\d+\/${INDEX_SOURCE}$`);

/** Similar-problem search: score = jaccardWeight · jaccard + ratingWeight · ratingCloseness. */
export const SIMILARITY = Object.freeze({
  jaccardWeight: 0.75,
  ratingWeight: 0.25,
  defaultK: 10,
  maxK: 30,
  defaultRatingWindow: 300,
  minRatingWindow: 50,
  maxRatingWindow: 1000,
  widenFactor: 2,
  untaggedRatingBand: 200,
  defaultTargetRating: 1200,
});

/** GET /problems paging. */
export const PROBLEM_LIST = Object.freeze({ defaultLimit: 20, maxLimit: 50, maxTags: 10, maxQueryLength: 100 });

export const PROBLEM_SOURCES = Object.freeze(['hf', 'cf_api']);
export const TOPIC_KINDS = Object.freeze(['single', 'pair']);
export const STUCK_INPUT_TYPES = Object.freeze(['text', 'url', 'pdf', 'image']);
export const TAG_SOURCES = Object.freeze(['db', 'ai', 'neighbors']);
export const ANSWER_SOURCES = Object.freeze(['ai', 'cache', 'fallback']);
export const GAP_STATUSES = Object.freeze(['unseen', 'weak', 'developing', 'strong']);
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

/**
 * Submission sync: lock length, CF page size, the page cap (also the first-sync limit), and the
 * per-user cooldown after `lastSyncedAt` (user-triggered syncs only; the cron job ignores it).
 */
export const SYNC = Object.freeze({ lockMs: 5 * 60_000, pageSize: 500, maxPages: 20, cooldownMs: 20_000 });
/** Weekly problemset refresh: Sundays at 03:00 server time. */
export const PROBLEMSET_SYNC_CRON = '0 3 * * 0';

/** Topic strength and stats views (Session 7) live in statsConstants.js. */
export * from './statsConstants.js';
/** Recommendations and the practice list (Session 8) live in recommendationConstants.js. */
export * from './recommendationConstants.js';
/** LLM coach chain (Session 9) lives in llmConstants.js. */
export * from './llmConstants.js';
/** Stuck flow (Session 10) lives in stuckConstants.js. */
export * from './stuckConstants.js';
