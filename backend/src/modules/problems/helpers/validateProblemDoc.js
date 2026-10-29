import { PROBLEM_ID_PATTERN } from '../../../config/constants.js';
import { ALL_TAGS } from '../../../config/tags.js';

const KNOWN_TAGS = new Set(ALL_TAGS);

/**
 * Why a cleaned document cannot be stored, or null when it is fine.
 * bulkWrite skips schema validators, so imports check the important rules here.
 */
export const rejectReason = (doc) => {
  if (!PROBLEM_ID_PATTERN.test(doc._id)) return 'invalidId';
  if (!Number.isInteger(doc.contestId) || doc.contestId < 1) return 'invalidContestId';
  if (doc._id !== `${doc.contestId}/${doc.index}`) return 'idMismatch';
  if (!doc.title) return 'missingTitle';
  if (doc.tags.some((tag) => !KNOWN_TAGS.has(tag))) return 'unknownTag';
  return null;
};

/** Splits docs into valid ones and a `{ reason: count }` map of rejections (with sample ids). */
export const partitionValid = (docs) => {
  const valid = [];
  const rejected = {};
  const rejectedIds = [];
  for (const doc of docs) {
    const reason = rejectReason(doc);
    if (reason === null) {
      valid.push(doc);
    } else {
      rejected[reason] = (rejected[reason] ?? 0) + 1;
      rejectedIds.push(doc._id);
    }
  }
  return { valid, rejected, rejectedIds };
};
