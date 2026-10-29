import { z } from 'zod';
import { ALL_TAGS } from '../../config/tags.js';
import {
  CONTEST_ID_PATTERN, PROBLEM_INDEX_PATTERN, PROBLEM_LIST, SIMILARITY,
} from '../../config/constants.js';

// Query strings send "" for `?x=`; treat that as "not given".
const blankToUndefined = (value) => (value === '' ? undefined : value);

// The default sits inside the preprocess so a blank value also gets it.
const queryInt = (min, max, fallback) => {
  const int = z.coerce.number().int().min(min).max(max);
  return z.preprocess(blankToUndefined, fallback === undefined ? int.optional() : int.default(fallback));
};

// Accepts ?tags=dp,greedy and ?tags=dp&tags=greedy; duplicates are removed.
const splitTags = (value) =>
  value === undefined
    ? []
    : [value].flat().flatMap((item) => String(item).split(',')).map((tag) => tag.trim()).filter(Boolean);

const tagList = z.preprocess(
  splitTags,
  z.array(z.enum([...ALL_TAGS], { error: 'Unknown tag' }))
    .max(PROBLEM_LIST.maxTags, `At most ${PROBLEM_LIST.maxTags} tags`)
    .transform((tags) => [...new Set(tags)]),
);

export const listQuerySchema = z
  .object({
    tags: tagList,
    matchAll: z.preprocess(blankToUndefined, z.stringbool().default(false)),
    minRating: queryInt(0, 4000),
    maxRating: queryInt(0, 4000),
    q: z.preprocess(blankToUndefined, z.string().trim().min(1).max(PROBLEM_LIST.maxQueryLength).optional()),
    page: queryInt(1, 10_000, 1),
    limit: queryInt(1, PROBLEM_LIST.maxLimit, PROBLEM_LIST.defaultLimit),
  })
  .refine(({ minRating, maxRating }) => minRating === undefined || maxRating === undefined
    || minRating <= maxRating, { message: 'minRating must not exceed maxRating', path: ['minRating'] });

export const problemParamsSchema = z.object({
  contestId: z.string().regex(CONTEST_ID_PATTERN, 'contestId must be a positive integer'),
  index: z
    .string()
    .trim()
    .toUpperCase()
    .pipe(z.string().regex(PROBLEM_INDEX_PATTERN, 'index must be 1-3 letters or digits (e.g. A, B1, F2)')),
});

export const similarQuerySchema = z.object({
  k: queryInt(1, SIMILARITY.maxK, SIMILARITY.defaultK),
  ratingWindow: queryInt(SIMILARITY.minRatingWindow, SIMILARITY.maxRatingWindow, SIMILARITY.defaultRatingWindow),
});
