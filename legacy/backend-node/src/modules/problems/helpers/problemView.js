/** Fields returned in lists and similar results (no statement or editorial text). */
export const SUMMARY_FIELDS = Object.freeze([
  'contestId', 'index', 'title', 'rating', 'tags', 'hasEditorial', 'source',
]);

/** Mongoose projection string for list queries. */
export const SUMMARY_PROJECTION = SUMMARY_FIELDS.join(' ');

const TEXT_FIELDS = Object.freeze(['description', 'inputFormat', 'outputFormat', 'note', 'editorial']);

// cf_api rows are written by bulkWrite, which skips schema defaults, so fields can be missing.
export const toProblemSummary = (doc) => ({
  id: doc._id,
  contestId: doc.contestId,
  index: doc.index,
  title: doc.title,
  rating: doc.rating ?? null,
  tags: doc.tags ?? [],
  hasEditorial: doc.hasEditorial ?? false,
  source: doc.source ?? 'hf',
  ...(doc.similarity && { similarity: doc.similarity }),
});

/** Full problem with every text field present ("" when missing) and `hasStatement`. */
export const toProblemDetail = (doc) => {
  const text = Object.fromEntries(TEXT_FIELDS.map((field) => [field, doc[field] ?? '']));
  return { ...toProblemSummary(doc), ...text, hasStatement: text.description.trim() !== '' };
};
