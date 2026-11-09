import { describe, expect, it } from 'vitest';
import { useTestDB } from '../../../helpers/db.js';
import { problemAt, seedProblems } from '../../../helpers/problems.js';
import { cfSubmission, cfUser, fakeCfClient } from '../../../helpers/codeforces.js';
import { createLinkedUser, createTestSyncService } from '../../../helpers/sync.js';
import { createVerifyService } from '../../../../src/modules/practice/practice.verify.js';
import { PracticeItem } from '../../../../src/modules/practice/practiceItem.model.js';

useTestDB();

const users = { ada_l: cfUser('Ada_L') };
const on = (id, contestId, index, verdict) => cfSubmission(id, { verdict, problem: { contestId, index, tags: ['dp'], rating: 1500 } });
const verifier = (submissions) =>
  createVerifyService({ syncService: createTestSyncService(fakeCfClient({ users, submissions })) });

describe('verify — solved', () => {
  it('creates a solved item (addedFrom recommendation) when an OK exists', async () => {
    await seedProblems([problemAt('50/B')]);
    const user = await createLinkedUser();
    const result = await verifier([on(2, 50, 'B', 'OK'), on(1, 50, 'B', 'WRONG_ANSWER')]).verify(user._id, '50/B');
    expect(result).toEqual({ verified: true, item: expect.objectContaining({ problemId: '50/B', status: 'solved', addedFrom: 'recommendation' }) });
    expect(await PracticeItem.countDocuments({ userId: user._id, status: 'solved' })).toBe(1);
  });

  it('marks an existing item solved and keeps where it came from', async () => {
    await seedProblems([problemAt('50/B')]);
    const user = await createLinkedUser();
    await PracticeItem.create({ userId: user._id, problemId: '50/B', addedFrom: 'stuck' });
    const { item } = await verifier([on(1, 50, 'B', 'OK')]).verify(user._id, '50/B');
    expect(item).toMatchObject({ status: 'solved', addedFrom: 'stuck', problem: expect.objectContaining({ id: '50/B' }) });
  });

  it('accepts an OK on a Div1/Div2 copy (same title, contest ±2)', async () => {
    await seedProblems([problemAt('1900/C', { title: 'Twin Towers' }), problemAt('1901/A', { title: 'twin towers' })]);
    const user = await createLinkedUser();
    const result = await verifier([on(1, 1901, 'A', 'OK')]).verify(user._id, '1900/C');
    expect(result.verified).toBe(true);
    expect(result.item.problemId).toBe('1900/C');
  });

  it('accepts an OK even when a newer submission is still judging', async () => {
    await seedProblems([problemAt('50/B')]);
    const user = await createLinkedUser();
    const result = await verifier([on(2, 50, 'B', 'TESTING'), on(1, 50, 'B', 'OK')]).verify(user._id, '50/B');
    expect(result.verified).toBe(true);
  });
});

describe('verify — not solved (200, not an error)', () => {
  it('NOT_SOLVED_YET without an OK, and leaves the practice list alone', async () => {
    await seedProblems([problemAt('50/B'), problemAt('53/A', { title: 'Title 50/B' })]);
    const user = await createLinkedUser();
    const result = await verifier([on(2, 53, 'A', 'OK'), on(1, 50, 'B', 'WRONG_ANSWER')]).verify(user._id, '50/B');
    expect(result).toEqual({ verified: false, reason: 'NOT_SOLVED_YET' });
    expect(await PracticeItem.countDocuments()).toBe(0);
  });

  it('STILL_JUDGING when the newest submission on the problem has no final verdict', async () => {
    await seedProblems([problemAt('50/B')]);
    const user = await createLinkedUser();
    const result = await verifier([on(2, 50, 'B', undefined), on(1, 50, 'B', 'WRONG_ANSWER')]).verify(user._id, '50/B');
    expect(result).toEqual({ verified: false, reason: 'STILL_JUDGING' });
  });

  it('NOT_SOLVED_YET when a judged submission is newer than the pending one', async () => {
    await seedProblems([problemAt('50/B')]);
    const user = await createLinkedUser();
    const result = await verifier([on(3, 50, 'B', 'WRONG_ANSWER'), on(2, 50, 'B', 'TESTING')]).verify(user._id, '50/B');
    expect(result.reason).toBe('NOT_SOLVED_YET');
  });

  it('ignores pending submissions on other problems', async () => {
    await seedProblems([problemAt('50/B')]);
    const user = await createLinkedUser();
    const result = await verifier([on(2, 60, 'A', 'TESTING'), on(1, 50, 'B', 'WRONG_ANSWER')]).verify(user._id, '50/B');
    expect(result.reason).toBe('NOT_SOLVED_YET');
  });
});
