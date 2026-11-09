import { cleanProblem, hasSpecialTag } from './cleanProblem.js';
import { partitionValid } from './validateProblemDoc.js';

const count = (docs, predicate) => docs.filter(predicate).length;

/** Cleans raw dataset rows and returns the documents to upsert plus the summary counts. */
export const prepareImport = (rows) => {
  const cleaned = rows.map(cleanProblem);
  const kept = cleaned.filter(Boolean);
  const { valid, rejected, rejectedIds } = partitionValid(kept);
  const summary = {
    read: rows.length,
    skippedEmptyDescription: rows.length - kept.length,
    rejected: Object.values(rejected).reduce((sum, n) => sum + n, 0),
    rejectedByReason: rejected,
    rejectedIds: rejectedIds.slice(0, 20),
    toUpsert: valid.length,
    withRating: count(valid, (doc) => doc.rating !== null),
    withTags: count(valid, (doc) => doc.tagCount > 0),
    withEditorial: count(valid, (doc) => doc.hasEditorial),
    withSpecialTag: count(valid, hasSpecialTag),
  };
  return { docs: valid, summary };
};
