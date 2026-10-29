import mongoose from 'mongoose';
import { User as UserModel } from '../users/user.model.js';
import { Submission as SubmissionModel } from '../sync/submission.model.js';
import { TopicStat as TopicStatModel } from '../stats/topicStat.model.js';
import { Problem as ProblemModel } from '../problems/problem.model.js';
import { PracticeItem as PracticeItemModel } from '../practice/practiceItem.model.js';
import { findSimilar as defaultFindSimilar } from '../problems/problems.service.js';
import { SUMMARY_PROJECTION, toProblemSummary } from '../problems/helpers/problemView.js';
import { withReason } from '../stats/helpers/emptyReason.js';
import { PICKED_BY, RECOMMENDATIONS, SIMILARITY } from '../../config/constants.js';
import { pickNextTopics } from './helpers/pickNextTopics.js';
import { baseRating, targetRange } from './helpers/targetRange.js';
import { maxJaccard, rankByFailed } from './helpers/rankByFailed.js';
import { createTagCountsCache } from './tagCounts.cache.js';
import { createContextLoader } from './recommendations.context.js';

// Extra similar results asked for, since Div1/Div2 copies of solved problems are dropped after.
const COPY_SLACK = 5;

const round4 = (value) => Math.round(value * 10_000) / 10_000;

const withoutSimilarity = ({ similarity: _similarity, ...summary }) => summary;

/**
 * getRecommendations(userId): next topics (pickNextTopics) and, per topic, up to 5 problems
 * rated in its target range, excluding solved problems (and their Div1/Div2 copies), practice
 * items and problems already picked for an earlier topic, ranked by similarity to recent
 * failures. A short pool is filled by findSimilar (its order kept), so a topic only gets no
 * problems when nothing else is left in the database.
 */
export const createRecommendationsService = ({
  User = UserModel,
  Submission = SubmissionModel,
  TopicStat = TopicStatModel,
  Problem = ProblemModel,
  PracticeItem = PracticeItemModel,
  tagCounts = createTagCountsCache({ Problem }),
  findSimilar = defaultFindSimilar,
  settings = RECOMMENDATIONS,
} = {}) => {
  const loadContext = createContextLoader({ User, Submission, TopicStat, Problem, PracticeItem, tagCounts, settings });

  const fromRange = async (topic, [min, max], ctx, excluded) => {
    const filter = { tags: topic, rating: mongoose.trusted({ $gte: min, $lte: max }), _id: mongoose.trusted({ $nin: excluded }) };
    const docs = await Problem.find(filter).select(SUMMARY_PROJECTION).lean();
    const fresh = docs.map(toProblemSummary).filter((problem) => !ctx.isSolved(problem));
    return rankByFailed(fresh, ctx.recentFailed).slice(0, settings.problemsPerTopic)
      .map((problem) => ({ ...problem, pickedBy: PICKED_BY.targetRange }));
  };

  const fromSimilar = async (topic, [min, max], ctx, excluded, missing) => {
    const { items } = await findSimilar({
      tags: [topic], rating: (min + max) / 2, ratingWindow: (max - min) / 2, userRating: ctx.userRating,
      excludeIds: excluded, excludeTitles: ctx.solvedTitles, k: Math.min(SIMILARITY.maxK, missing + COPY_SLACK),
    });
    // findSimilar's order is kept (topic match first); only the similarity to failures is added.
    return items.map(withoutSimilarity).filter((problem) => !ctx.isSolved(problem)).slice(0, missing)
      .map((problem) => ({ ...problem, similarityToFailed: round4(maxJaccard(problem.tags, ctx.recentFailed)), pickedBy: PICKED_BY.similar }));
  };

  const problemsFor = async (pick, ctx, taken) => {
    const range = targetRange(baseRating(pick.comfortRating, ctx.userRating, settings), settings);
    const excluded = [...ctx.excludeIds, ...taken];
    const ranked = await fromRange(pick.topic, range, ctx, excluded);
    const missing = settings.problemsPerTopic - ranked.length;
    const extra = missing > 0
      ? await fromSimilar(pick.topic, range, ctx, [...excluded, ...ranked.map(({ id }) => id)], missing)
      : [];
    return { ...pick, targetRange: { min: range[0], max: range[1] }, problems: [...ranked, ...extra] };
  };

  const getRecommendations = async (userId) => {
    const ctx = await loadContext(userId);
    const picks = pickNextTopics(ctx.stats, ctx.freq, settings.topics, { ratingKnown: ctx.userRating !== null, settings });
    const taken = new Set();
    const topics = [];
    for (const pick of picks) {
      const topic = await problemsFor(pick, ctx, taken);
      topic.problems.forEach(({ id }) => taken.add(id));
      topics.push(topic);
    }
    const meta = withReason({
      userRating: ctx.userRating,
      frequencyRating: ctx.freq.rating,
      coldStart: ctx.stats.length === 0,
      recentFailed: ctx.recentFailed.length,
    }, ctx.user);
    return { data: { topics }, meta };
  };

  return { getRecommendations };
};
