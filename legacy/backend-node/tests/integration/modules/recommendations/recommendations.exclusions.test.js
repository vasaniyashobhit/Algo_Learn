import { describe, expect, it } from 'vitest';
import { useTestDB } from '../../../helpers/db.js';
import { problemAt, seedProblems } from '../../../helpers/problems.js';
import { createSyncedUser, insertSubmissions } from '../../../helpers/stats.js';
import {
  addToPractice, createTestRecommendationsService, insertTopicStats, problemIds, topicOf,
} from '../../../helpers/recommendations.js';

useTestDB();

const dpAt = (id, rating, extra = {}) => problemAt(id, { tags: ['dp'], rating, ...extra });

describe('getRecommendations — exclusions', () => {
  it('excludes solved problems, their Div1/Div2 copies and practice items', async () => {
    const user = await createSyncedUser({ cfRating: 1300 });
    await insertTopicStats(user._id, [['dp', 6, 0.5, 1400]]);
    await seedProblems([
      dpAt('100/A', 1500, { title: 'Grid Walk' }),
      dpAt('101/C', 1600, { title: 'GRID WALK' }),
      dpAt('104/C', 1600, { title: 'grid walk' }),
      dpAt('110/A', 1500), dpAt('111/A', 1600), dpAt('112/A', 1700),
      dpAt('113/A', 1800), dpAt('114/A', 1400),
    ]);
    await insertSubmissions(user._id, [['100/A', ['dp'], 1500, 'OK']]);
    await addToPractice(user._id, ['110/A']);
    const { data } = await createTestRecommendationsService().getRecommendations(user._id);
    const dp = topicOf(data, 'dp');
    expect(dp.targetRange).toEqual({ min: 1500, max: 1700 });
    expect(problemIds(dp)).toEqual(['104/C', '111/A', '112/A', '113/A', '114/A']);
    expect(dp.problems.at(-1).pickedBy).toBe('similar_fallback');
    expect(dp.problems.slice(0, 2).map(({ pickedBy }) => pickedBy)).toEqual(['target_range', 'target_range']);
  });

  it('never recommends the same problem under two topics', async () => {
    const user = await createSyncedUser({ cfRating: 1300 });
    await insertTopicStats(user._id, [['dp', 6, 0.5, 1400], ['greedy', 6, 0.5, 1400]]);
    await seedProblems([
      problemAt('1/A', { tags: ['dp', 'greedy'], rating: 1500 }),
      problemAt('2/A', { tags: ['greedy'], rating: 1500 }),
    ]);
    const { data } = await createTestRecommendationsService().getRecommendations(user._id);
    const all = data.topics.flatMap(problemIds);
    expect(new Set(all).size).toBe(all.length);
    expect(all.filter((id) => id === '1/A')).toHaveLength(1);
  });

  it('answers 401 AUTH_INVALID_TOKEN for a deleted account', async () => {
    const user = await createSyncedUser();
    await user.deleteOne();
    await expect(createTestRecommendationsService().getRecommendations(user._id))
      .rejects.toMatchObject({ statusCode: 401, code: 'AUTH_INVALID_TOKEN' });
  });
});
