import { describe, expect, it } from 'vitest';
import { useTestDB } from '../../../helpers/db.js';
import { makeSubmission, makeTopicStat, makeUser, objectId } from '../../../helpers/factories.js';
import { problemAt, seedProblems } from '../../../helpers/problems.js';
import { createStuckRepository } from '../../../../src/modules/stuck/stuck.repository.js';
import { TopicStat } from '../../../../src/modules/stats/topicStat.model.js';
import { Submission } from '../../../../src/modules/sync/submission.model.js';
import { User } from '../../../../src/modules/users/user.model.js';

useTestDB();
const repo = createStuckRepository();

describe('stuck repository', () => {
  it('finds a problem by id with the statement and editorial fields', async () => {
    await seedProblems([problemAt('1/A', { title: 'Theatre Square', editorial: 'Ceil.' })]);
    expect(await repo.findProblem('1/A')).toMatchObject({ _id: '1/A', title: 'Theatre Square', editorial: 'Ceil.', tags: ['dp', 'greedy'] });
    expect(await repo.findProblem('2/A')).toBeNull();
  });

  it('text-searches the nearest problems by relevance', async () => {
    await seedProblems([
      problemAt('1/A', { title: 'Theatre Square', description: 'Pave the theatre square with flagstones.' }),
      problemAt('2/A', { title: 'Watermelon', description: 'Divide the watermelon.' }),
      problemAt('3/A', { title: 'Square', description: 'A square grid of flagstones.' }),
    ]);
    const found = await repo.searchProblems('theatre square flagstones', 5);
    expect(found.map(({ _id }) => _id)).toEqual(['1/A', '3/A']);
    expect(await repo.searchProblems('theatre', 1)).toHaveLength(1);
    expect(await repo.searchProblems('', 5)).toEqual([]);
  });

  it('reads only the requested topic stats of that user', async () => {
    const user = await User.create(makeUser());
    await TopicStat.create([
      makeTopicStat({ userId: user._id, topicKey: 'dp', strength: 0.3 }),
      makeTopicStat({ userId: user._id, topicKey: 'math', strength: 0.9 }),
      makeTopicStat({ topicKey: 'dp', strength: 0.8 }),
    ]);
    const stats = await repo.topicStats(String(user._id), ['dp', 'greedy']);
    expect(stats).toEqual([expect.objectContaining({ topicKey: 'dp', strength: 0.3, kind: 'single' })]);
  });

  it('returns the user rating and solved problem ids', async () => {
    const user = await User.create(makeUser({ cfRating: 1450 }));
    await Submission.create([
      makeSubmission({ userId: user._id, problemId: '4/A', verdict: 'OK' }),
      makeSubmission({ userId: user._id, problemId: '4/A', verdict: 'OK' }),
      makeSubmission({ userId: user._id, problemId: '5/B', verdict: 'WRONG_ANSWER' }),
    ]);
    expect(await repo.userContext(String(user._id))).toEqual({ userRating: 1450, solvedIds: ['4/A'] });
    expect(await repo.userContext(String(objectId()))).toEqual({ userRating: null, solvedIds: [] });
  });

  it('saves a stuck query and returns a plain object', async () => {
    const user = await User.create(makeUser());
    const saved = await repo.saveQuery({ userId: user._id, inputType: 'text', rawInput: 'x', source: 'fallback', result: { a: 1 } });
    expect(saved).toMatchObject({ inputType: 'text', result: { a: 1 }, createdAt: expect.any(Date) });
    expect(saved._id).toBeDefined();
  });
});
