import { z } from 'zod';
import { PRACTICE_ORIGINS, PRACTICE_STATUSES, PROBLEM_ID_PATTERN } from '../../config/constants.js';
import { blankToUndefined } from '../problems/problems.schema.js';

export const practiceListQuerySchema = z.object({
  status: z.preprocess(blankToUndefined, z.enum([...PRACTICE_STATUSES]).optional()),
});

// "4/b1" → "4/B1", like the index route param.
const problemIdField = z
  .string()
  .trim()
  .toUpperCase()
  .pipe(z.string().regex(PROBLEM_ID_PATTERN, 'problemId must look like "<contestId>/<index>", e.g. 1/A'));

export const addPracticeSchema = z.strictObject({
  problemId: problemIdField,
  addedFrom: z.enum([...PRACTICE_ORIGINS]).default('manual'),
});

export const updatePracticeSchema = z.strictObject({
  status: z.enum([...PRACTICE_STATUSES]),
});
