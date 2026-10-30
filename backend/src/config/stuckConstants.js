/** Stuck flow constants (Session 10), re-exported by constants.js: import them from there. */

/**
 * Inputs: pasted text needs `minTextLength` chars; other URLs are fetched with `url` limits
 * (whole fetch incl. redirects); uploads are capped at `upload.maxBytes` and these mime types.
 */
export const STUCK = Object.freeze({
  minTextLength: 40,
  maxTextLength: 20_000,
  maxUrlLength: 2_048,
  url: Object.freeze({ timeoutMs: 8_000, maxBytes: 2 * 1024 * 1024, maxRedirects: 3 }),
  upload: Object.freeze({
    maxBytes: 5 * 1024 * 1024,
    mimeTypes: Object.freeze(['application/pdf', 'image/png', 'image/jpeg', 'image/webp', 'text/plain']),
  }),
  ocrLanguage: 'eng',
  neighbors: 5,
  maxNeighborTags: 4,
  similarK: 10,
  easierBy: 150,
  maxHints: 3,
  historyLimit: 20,
  rateLimit: Object.freeze({ windowMs: 60 * 60_000, limit: 10 }),
});

/** Gap status thresholds: strength < weakBelow → weak, > strongAbove → strong, else developing. */
export const GAP = Object.freeze({ weakBelow: 0.4, strongAbove: 0.7 });

export const STUCK_FALLBACK_NOTICE =
  'AI solution temporarily unavailable. Here are the likely topics, your weak areas, similar problems and editorials.';
