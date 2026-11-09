import { Submission } from '../../src/modules/sync/submission.model.js';
import { TopicStat } from '../../src/modules/stats/topicStat.model.js';
import { User } from '../../src/modules/users/user.model.js';
import { createStatsService } from '../../src/modules/stats/stats.service.js';
import { makeSubmission, makeUser } from './factories.js';

export const STATS_NOW = new Date('2026-10-29T12:00:00Z');

export const createTestStatsService = (options = {}) => createStatsService({ now: () => STATS_NOW, ...options });

/** A user with a linked, already-synced handle (rating 1200 unless overridden). */
export const createSyncedUser = (overrides = {}) =>
  User.create(makeUser({ cfHandle: 'Ada_L', cfRating: 1200, lastSyncedAt: STATS_NOW, ...overrides }));

/** Inserts submissions of `userId`: each spec is `[problemId, tags, rating, verdict, daysAgo?]`. */
export const insertSubmissions = (userId, specs) =>
  Submission.insertMany(specs.map(([problemId, problemTags, problemRating, verdict, daysAgo = 0]) => {
    const [contestId, index] = problemId.split('/');
    return makeSubmission({
      userId,
      problemId,
      contestId: Number(contestId),
      index,
      problemTags,
      problemRating,
      verdict,
      submittedAt: new Date(STATS_NOW - daysAgo * 86_400_000),
    });
  }));

export const statsOf = async (userId) => {
  const docs = await TopicStat.find({ userId }).sort({ topicKey: 1 }).lean();
  return Object.fromEntries(docs.map((doc) => [doc.topicKey, doc]));
};
