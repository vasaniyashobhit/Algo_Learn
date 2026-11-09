import { jaccard } from '../../problems/helpers/similarity.js';

const round4 = (value) => Math.round(value * 10_000) / 10_000;

/** Highest topic-tag jaccard between `tags` and any recently failed problem (0 when none). */
export const maxJaccard = (tags, failed) =>
  failed.reduce((best, { tags: failedTags }) => Math.max(best, jaccard(tags, failedTags)), 0);

const ratingOrLast = (rating) => rating ?? Number.MAX_SAFE_INTEGER;

/**
 * Candidates (problem summaries: `{ id, rating, tags, ... }`) with `similarityToFailed`, sorted by it desc,
 * then rating asc (unrated last), then id.
 */
export const rankByFailed = (candidates, failed) =>
  candidates
    .map((doc) => ({ ...doc, similarityToFailed: round4(maxJaccard(doc.tags ?? [], failed)) }))
    .toSorted((a, b) => b.similarityToFailed - a.similarityToFailed
      || ratingOrLast(a.rating) - ratingOrLast(b.rating)
      || a.id.localeCompare(b.id));
