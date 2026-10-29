import { isTopicTag } from '../../../config/tags.js';
import { LLM } from '../../../config/constants.js';

const clean = (value, max) => String(value).trim().slice(0, max);

const cleanList = (items, maxItems, maxLength = LLM.maxItemLength) =>
  items.map((item) => clean(item, maxLength)).filter(Boolean).slice(0, maxItems);

/** Official topic tags only (lower-cased, deduplicated, at most LLM.maxTags). */
export const sanitizeTags = (tags) =>
  [...new Set(tags.map((tag) => String(tag).trim().toLowerCase()).filter(isTopicTag))]
    .slice(0, LLM.maxTags);

/** Clamped to 800–3500 and rounded to 100; anything that is not a number → null. */
export const sanitizeRating = (rating) => {
  const value = typeof rating === 'string' && rating.trim() !== '' ? Number(rating) : rating;
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  const clamped = Math.min(LLM.ratingMax, Math.max(LLM.ratingMin, value));
  return Math.round(clamped / LLM.ratingStep) * LLM.ratingStep;
};

/** Bounds a schema-valid answer: known tags, clamped rating, limited arrays and strings. */
export const sanitizeCoachResponse = (data) => ({
  tags: sanitizeTags(data.tags),
  estimatedRating: sanitizeRating(data.estimatedRating),
  hints: cleanList(data.hints, LLM.maxHints),
  approach: clean(data.approach, LLM.maxTextLength),
  solutionSteps: cleanList(data.solutionSteps, LLM.maxSolutionSteps),
  complexity: clean(data.complexity, LLM.maxItemLength),
  code: String(data.code).trim().slice(0, LLM.maxCodeLength),
  pitfalls: cleanList(data.pitfalls, LLM.maxPitfalls),
});
