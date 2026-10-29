import { AppError } from '../../../errors/AppError.js';
import { codes } from '../../../errors/codes.js';

const DUPLICATE_KEY = 11000;

const onlyDuplicates = (err) => {
  const writeErrors = err?.writeErrors ?? [];
  return writeErrors.length > 0
    && writeErrors.every((writeError) => (writeError.code ?? writeError.err?.code) === DUPLICATE_KEY);
};

/**
 * insertMany with ordered:false: submissions already stored (same cfSubmissionId) are skipped
 * and the rest are still inserted. Returns how many were new. Any other failure is a 500.
 */
export const insertIgnoringDuplicates = async (model, docs) => {
  if (!docs.length) return 0;
  try {
    const inserted = await model.insertMany(docs, { ordered: false });
    return inserted.length;
  } catch (err) {
    if (onlyDuplicates(err)) return err.insertedDocs?.length ?? 0;
    throw new AppError(500, codes.INTERNAL_ERROR, 'Could not save submissions', null, { cause: err });
  }
};
