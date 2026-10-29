import { describe, expect, it } from 'vitest';
import { useTestDB } from '../../../helpers/db.js';
import { problemAt, seedProblems } from '../../../helpers/problems.js';
import { createSyncedUser, insertSubmissions } from '../../../helpers/stats.js';
import { addToPractice, insertTopicStats } from '../../../helpers/recommendations.js';
import { createContextLoader } from '../../../../src/modules/recommendations/recommendations.context.js';
import { User } from '../../../../src/modules/users/user.model.js';
import { Submission } from '../../../../src/modules/sync/submission.model.js';
import { TopicStat } from '../../../../src/modules/stats/topicStat.model.js';
import { Problem } from '../../../../src/modules/problems/problem.model.js';
import { PracticeItem } from '../../../../src/modules/practice/practiceItem.model.js';

useTestDB();

const counts = [{ rating: 1500, total: 4, tags: { dp: 1 } }];
const load = createContextLoader({ User, Submission, TopicStat, Problem, PracticeItem, tagCounts: { get: async () => counts } });

describe('createContextLoader', () => {
  it('collects stats, frequency, failures and exclusions of one user', async () => {
    const user = await createSyncedUser({ cfRating: 1500 });
    await seedProblems([problemAt('5/A', { title: 'Twin' })]);
    await insertTopicStats(user._id, [['dp', 4, 0.5]]);
    await insertSubmissions(user._id, [
      ['5/A', ['dp'], 1500, 'OK'], ['8/B', ['dp'], 1500, 'OK'], ['9/A', ['math'], 1500, 'WRONG_ANSWER'],
    ]);
    await addToPractice(user._id, ['5/A', '20/A']);
    const ctx = await load(user._id);
    expect(ctx.userRating).toBe(1500);
    expect(ctx.stats.map(({ topicKey }) => topicKey)).toEqual(['dp']);
    expect(ctx.freq).toMatchObject({ rating: 1500, total: 4 });
    expect(ctx.freq.frequency.dp).toBe(0.25);
    expect(ctx.recentFailed).toEqual([{ problemId: '9/A', tags: ['math'] }]);
    expect(ctx.excludeIds.toSorted()).toEqual(['20/A', '5/A', '8/B']);
    expect(ctx.solvedTitles).toEqual(['Twin']);
    expect(ctx.isSolved({ id: '6/C', title: 'TWIN', contestId: 6 })).toBe(true);
    expect(ctx.isSolved({ id: '8/B', title: 'x', contestId: 8 })).toBe(true);
  });

  it('works for a user with nothing yet', async () => {
    const user = await createSyncedUser({ cfRating: null });
    const ctx = await load(user._id);
    expect(ctx).toMatchObject({ userRating: null, stats: [], recentFailed: [], excludeIds: [], solvedTitles: [] });
    expect(ctx.freq.rating).toBe(1200);
  });
});
