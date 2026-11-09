import { describe, expect, it, vi } from 'vitest';
import { useTestDB } from '../../../helpers/db.js';
import { problemAt, seedProblems } from '../../../helpers/problems.js';
import { createSyncedUser, insertSubmissions } from '../../../helpers/stats.js';
import {
  createTestRecommendationsService, insertTopicStats, problemIds, topicOf,
} from '../../../helpers/recommendations.js';
import { findSimilar } from '../../../../src/modules/problems/problems.service.js';

useTestDB();

describe('getRecommendations — ranking and fill', () => {
  it('ranks by max jaccard to the recent failures, ties by rating ascending', async () => {
    const user = await createSyncedUser({ cfRating: 1300 });
    await insertTopicStats(user._id, [['dp', 6, 0.5, 1400]]);
    await seedProblems([
      problemAt('1/A', { tags: ['dp'], rating: 1500 }),
      problemAt('2/A', { tags: ['dp', 'graphs'], rating: 1700 }),
      problemAt('3/A', { tags: ['dp', 'graphs', 'trees'], rating: 1600 }),
      problemAt('4/A', { tags: ['dp', 'math'], rating: 1600 }),
      problemAt('5/A', { tags: ['dp', 'math'], rating: 1500 }),
    ]);
    await insertSubmissions(user._id, [
      ['90/A', ['dp', 'graphs'], 1500, 'WRONG_ANSWER', 2],
      ['91/A', ['math'], 1500, 'WRONG_ANSWER', 1],
    ]);
    const { data, meta } = await createTestRecommendationsService().getRecommendations(user._id);
    const dp = topicOf(data, 'dp');
    expect(problemIds(dp)).toEqual(['2/A', '3/A', '1/A', '5/A', '4/A']);
    expect(dp.problems.map(({ similarityToFailed }) => similarityToFailed)).toEqual([1, 0.6667, 0.5, 0.5, 0.5]);
    expect(meta).toMatchObject({ userRating: 1300, frequencyRating: 1300, coldStart: false, recentFailed: 2 });
  });

  it('fills a short pool through findSimilar with the target range as its window', async () => {
    const user = await createSyncedUser({ cfRating: 1300 });
    await insertTopicStats(user._id, [['dp', 6, 0.5, 1400]]);
    await seedProblems([
      problemAt('1/A', { tags: ['dp'], rating: 1600 }),
      problemAt('2/A', { tags: ['dp'], rating: 2000 }),
      problemAt('3/A', { tags: ['math'], rating: 1600 }),
    ]);
    const spy = vi.fn(findSimilar);
    const { data } = await createTestRecommendationsService({ findSimilar: spy }).getRecommendations(user._id);
    const dp = topicOf(data, 'dp');
    expect(problemIds(dp)).toEqual(['1/A', '2/A', '3/A']);
    expect(dp.problems.map(({ pickedBy }) => pickedBy)).toEqual(['target_range', 'similar_fallback', 'similar_fallback']);
    expect(dp.problems[1]).not.toHaveProperty('similarity');
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({
      tags: ['dp'], rating: 1600, ratingWindow: 100, userRating: 1300, excludeIds: ['1/A'], k: 9,
    }));
  });

  it('cold start without a handle: frequent tags at 1200, never blank', async () => {
    const user = await createSyncedUser({ cfHandle: undefined, cfRating: null, lastSyncedAt: null });
    await seedProblems([
      problemAt('1/A', { tags: ['math'], rating: 1200 }),
      problemAt('2/A', { tags: ['math', 'greedy'], rating: 1300 }),
      problemAt('3/A', { tags: ['math'], rating: 2500 }),
    ]);
    const { data, meta } = await createTestRecommendationsService().getRecommendations(user._id);
    expect(data.topics.map(({ topic }) => topic)).toEqual(['math', 'greedy', '2-sat']);
    expect(data.topics[0]).toMatchObject({
      basis: 'frequent', targetRange: { min: 1300, max: 1500 },
      reason: 'New topic for you: math shows up in 100% of problems rated around 1200',
    });
    expect(problemIds(data.topics[0])).toEqual(['2/A', '1/A', '3/A']);
    expect(data.topics.every(({ problems }) => Array.isArray(problems))).toBe(true);
    expect(meta).toEqual({ userRating: null, frequencyRating: 1200, coldStart: true, recentFailed: 0, reason: 'NO_HANDLE' });
  });
});
