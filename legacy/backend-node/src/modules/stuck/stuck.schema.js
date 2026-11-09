import { z } from 'zod';
import { STUCK, STUCK_INPUT_TYPES } from '../../config/constants.js';
import { blankToUndefined, queryInt } from '../problems/problems.schema.js';

/**
 * POST /stuck body (multipart fields or JSON). Which of `text`/`url`/`file` is required depends
 * on `inputType` and is checked by the input resolver (the file is not part of the body).
 */
export const stuckBodySchema = z.strictObject({
  inputType: z.enum([...STUCK_INPUT_TYPES]),
  text: z.preprocess(blankToUndefined, z.string().max(STUCK.maxTextLength).optional()),
  url: z.preprocess(blankToUndefined, z.string().trim().max(STUCK.maxUrlLength).optional()),
});

export const stuckHistoryQuerySchema = z.object({
  page: queryInt(1, 10_000, 1),
});
