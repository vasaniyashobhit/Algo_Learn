import { z } from 'zod';
import { LlmError } from '../helpers/llmError.js';
import { sanitizeCoachResponse } from './sanitizeCoachResponse.js';

const textList = z.array(z.string()).default([]);

/** Raw model output. Unknown keys are dropped; the sanitizer bounds everything afterwards. */
export const coachResponseSchema = z.object({
  tags: textList,
  estimatedRating: z.union([z.number(), z.string(), z.null()]).optional(),
  hints: z.array(z.string()).min(1),
  approach: z.string().min(1),
  solutionSteps: textList,
  complexity: z.string().default(''),
  code: z.string().default(''),
  pitfalls: textList,
});

const FENCE = /^```(?:json)?\s*([\s\S]*?)\s*```$/i;

const parseJson = (raw) => {
  const trimmed = String(raw ?? '').trim();
  try {
    return JSON.parse(trimmed.match(FENCE)?.[1] ?? trimmed);
  } catch (err) {
    throw new LlmError('The model did not answer with valid JSON', { reason: 'invalid_json', cause: err });
  }
};

/** Validates an already-parsed object and sanitizes it. Throws LlmError `invalid_schema`. */
export const validateCoachResponse = (value) => {
  const result = coachResponseSchema.safeParse(value);
  const answer = result.success ? sanitizeCoachResponse(result.data) : null;
  if (!answer || answer.hints.length === 0 || !answer.approach) {
    throw new LlmError('The model answer does not match the coach schema', {
      reason: 'invalid_schema',
      cause: result.error,
    });
  }
  return answer;
};

/** Model text → sanitized coach answer (code fences around the JSON are tolerated). */
export const parseCoachResponse = (raw) => validateCoachResponse(parseJson(raw));
