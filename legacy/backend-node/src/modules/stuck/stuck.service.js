import { LLM_FALLBACK_REASONS, STUCK } from '../../config/constants.js';
import { topicKeysFor } from '../stats/helpers/topicKeys.js';
import { analyzeGap } from './helpers/gapAnalysis.js';
import { buildResult, solutionOf } from './helpers/buildResult.js';
import { firstLine, statementOf, stripIndexPrefix } from './helpers/problemMatch.js';
import { toStuckResult } from './helpers/stuckView.js';
import { createLocator } from './stuck.locate.js';

const MAX_TITLE = 120;

const titleGuess = (text) => stripIndexPrefix(firstLine(text)).slice(0, MAX_TITLE) || null;

const gapDoc = ({ topicKey, kind, strength, status }) => ({ topicKey, kind, strength, status });

const tooLate = { answer: null, source: 'fallback', reason: LLM_FALLBACK_REASONS.timeout };

/**
 * `solve({ userId, inputType, payload })` → the saved, never-blank stuck result. Steps: resolve
 * the input → find the problem in the DB → coach (AI or fallback) → tags (db/ai/neighbors) →
 * concept gap → similar problems (easier on gap topics) → save. One request deadline
 * (`requestDeadlineMs`, 50 s) is shared: input reading (image ≤ 20 s, OCR ≤ 15 s) uses it first,
 * the coach gets what is left, or is skipped (AI_TIMEOUT fallback) when under `coachMinMs`.
 */
export const createStuckService = ({
  resolveInput, getCoachAnswer, findSimilar, repo, now = Date.now, limits = STUCK,
}) => {
  const { locate, detectTags } = createLocator({ repo });

  const similarFor = async ({ tags, rating, gap, match, context }) => {
    const easier = gap.items.some(({ kind }) => kind === 'single');
    const base = rating ?? context.userRating;
    const { items, meta } = await findSimilar({
      tags,
      rating: base === null ? null : base - (easier ? STUCK.easierBy : 0),
      userRating: context.userRating,
      excludeIds: [...(match ? [match._id] : []), ...context.solvedIds],
      excludeTitles: match ? [match.title] : [],
      k: STUCK.similarK,
    });
    return { items, easier, targetRating: meta.targetRating, strategies: meta.strategies };
  };

  const coachFor = async ({ match, input, text, deadline }) => {
    if (deadline - now() < limits.coachMinMs) return tooLate;
    return getCoachAnswer({ problemId: match?._id ?? input.problemId, text, knownTags: match?.tags ?? [], deadline });
  };

  const solve = async ({ userId, inputType, payload }) => {
    const deadline = now() + limits.requestDeadlineMs;
    const input = await resolveInput({ inputType, ...payload, deadline });
    const { match, neighbors } = await locate(input);
    const text = input.text ?? (match ? statementOf(match) : '');
    const coach = await coachFor({ match, input, text, deadline });
    const { tags, tagsSource, rating } = await detectTags({ match, answer: coach.answer, neighbors, text });
    const [context, stats] = await Promise.all([
      repo.userContext(userId),
      tags.length ? repo.topicStats(userId, topicKeysFor(tags).map(({ topicKey }) => topicKey)) : [],
    ]);
    const gap = analyzeGap({ tags, stats });
    const similar = await similarFor({ tags, rating, gap, match, context });
    const problem = {
      matchedProblemId: match?._id ?? null,
      requestedProblemId: input.problemId ?? null,
      title: match?.title ?? titleGuess(text),
      tags,
      tagsSource,
      rating,
    };
    const result = buildResult({ coach, problem, editorial: match?.editorial, gap, similar });
    const saved = await repo.saveQuery({
      userId, inputType, rawInput: input.rawInput, matchedProblemId: problem.matchedProblemId,
      detectedTags: tags, tagsSource: tagsSource ?? undefined, estimatedRating: rating,
      gap: gap.items.map(gapDoc), result, solution: solutionOf(coach.answer), source: coach.source,
    });
    return toStuckResult(saved);
  };

  return { solve };
};
