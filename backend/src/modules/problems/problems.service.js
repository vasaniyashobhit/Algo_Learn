import { Problem } from './problem.model.js';
import { NotFoundError } from '../../errors/httpErrors.js';
import { codes } from '../../errors/codes.js';
import { PROBLEM_LIST, SIMILARITY } from '../../config/constants.js';
import { buildListFilter, buildListSort } from './helpers/listQuery.js';
import { SUMMARY_PROJECTION, toProblemSummary, toProblemDetail } from './helpers/problemView.js';
import { buildSimilarPipeline } from './helpers/similarPipeline.js';
import { planAttempts } from './helpers/fallbackPlan.js';
import { topicTagsOf } from './helpers/similarity.js';

export const problemId = (contestId, index) => `${contestId}/${index}`;

const notFound = (id) => new NotFoundError(codes.PROBLEM_NOT_FOUND, `Problem ${id} was not found`);

/** Paged list without statement text; `meta` has page, limit, total, totalPages. */
export const list = async ({ page = 1, limit = PROBLEM_LIST.defaultLimit, ...filters } = {}) => {
  const size = Math.min(limit, PROBLEM_LIST.maxLimit);
  const filter = buildListFilter(filters);
  const [docs, total] = await Promise.all([
    Problem.find(filter).select(SUMMARY_PROJECTION).sort(buildListSort(filters))
      .skip((page - 1) * size).limit(size).lean(),
    Problem.countDocuments(filter),
  ]);
  return {
    items: docs.map(toProblemSummary),
    meta: { page, limit: size, total, totalPages: Math.ceil(total / size) },
  };
};

export const getById = async (contestId, index) => {
  const id = problemId(contestId, index);
  const doc = await Problem.findById(id).lean();
  if (!doc) throw notFound(id);
  return toProblemDetail(doc);
};

/**
 * Never-blank similar search: runs the planned attempts (see fallbackPlan.js) in order, and each
 * later attempt fills the slots still free (excluding what was already found) until `k` are found.
 * `meta.strategy` is the first attempt that returned anything; `meta.strategies` lists all of them.
 */
export const findSimilar = async ({
  tags = [], rating = null, userRating = null, excludeIds = [], excludeTitles = [],
  k = SIMILARITY.defaultK, ratingWindow = SIMILARITY.defaultRatingWindow,
} = {}) => {
  const topicTags = topicTagsOf(tags);
  const limit = Math.min(k, SIMILARITY.maxK);
  const attempts = planAttempts({ tags: topicTags, rating, ratingWindow, userRating });
  const docs = [];
  const used = [];
  for (const attempt of attempts) {
    if (docs.length >= limit) break;
    const excluded = [...excludeIds, ...docs.map(({ _id }) => _id)];
    const pipeline = buildSimilarPipeline({
      ...attempt, tags: topicTags, k: limit - docs.length, excludeIds: excluded, excludeTitles,
    });
    const found = await Problem.aggregate(pipeline);
    if (found.length) used.push(attempt);
    docs.push(...found);
  }
  const main = used[0] ?? attempts.at(-1);
  return {
    items: docs.map(toProblemSummary),
    meta: {
      strategy: main.strategy,
      strategies: used.map(({ strategy }) => strategy),
      ratingWindow: main.window,
      targetRating: main.target,
      count: docs.length,
    },
  };
};

/** Similar to a stored problem, excluding itself and problems with the exact same title. */
export const findSimilarToProblem = async (id, opts = {}) => {
  const source = await Problem.findById(id).select('title tags rating').lean();
  if (!source) throw notFound(id);
  const { items, meta } = await findSimilar({
    ...opts,
    tags: source.tags ?? [],
    rating: source.rating ?? null,
    excludeIds: [id],
    excludeTitles: [source.title],
  });
  const problem = { id, title: source.title, rating: source.rating ?? null, tags: source.tags ?? [] };
  return { items, meta: { ...meta, problem } };
};
