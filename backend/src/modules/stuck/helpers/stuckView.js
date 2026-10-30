/** Fields read for the history list (no raw input, result body or solution). */
export const HISTORY_PROJECTION = 'inputType source matchedProblemId detectedTags estimatedRating gap result.problem createdAt';

/** A stored stuck query as returned by POST /stuck and GET /stuck/:id (never the solution). */
export const toStuckResult = (doc) => ({
  id: String(doc._id),
  inputType: doc.inputType,
  createdAt: doc.createdAt,
  ...doc.result,
});

/** One row of GET /stuck/history. */
export const toHistoryItem = (doc) => ({
  id: String(doc._id),
  inputType: doc.inputType,
  createdAt: doc.createdAt,
  source: doc.source,
  problem: doc.result?.problem ?? {
    matchedProblemId: doc.matchedProblemId ?? null, title: null, tags: doc.detectedTags ?? [],
    tagsSource: null, rating: doc.estimatedRating ?? null,
  },
  gapTopics: (doc.gap ?? []).map(({ topicKey }) => topicKey),
});
