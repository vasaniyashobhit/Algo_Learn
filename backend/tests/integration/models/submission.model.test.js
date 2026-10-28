import { describe, expect, it } from 'vitest';
import { Submission } from '../../../src/modules/sync/submission.model.js';
import { useTestDB } from '../../helpers/db.js';
import { makeSubmission, objectId } from '../../helpers/factories.js';
import { expectDuplicateKey, indexesByName, invalidPaths } from '../../helpers/assertions.js';

useTestDB();

describe('Submission model', () => {
  it('requires the CF id, user, problem, contest, index, verdict and time', () => {
    expect(invalidPaths(Submission, {}).toSorted()).toEqual([
      'cfSubmissionId', 'contestId', 'index', 'problemId', 'submittedAt', 'userId', 'verdict',
    ]);
  });

  it('only accepts Codeforces verdicts', () => {
    expect(invalidPaths(Submission, makeSubmission({ verdict: 'ACCEPTED' }))).toEqual(['verdict']);
    expect(invalidPaths(Submission, makeSubmission({ verdict: 'TIME_LIMIT_EXCEEDED' }))).toEqual([]);
  });

  it('defaults problemRating to null and problemTags to []', async () => {
    const saved = await Submission.create(makeSubmission({ problemRating: undefined, problemTags: undefined }));
    expect(saved.problemRating).toBeNull();
    expect(saved.problemTags).toEqual([]);
  });

  it('rejects a duplicate cfSubmissionId (409)', async () => {
    await Submission.create(makeSubmission({ cfSubmissionId: 42 }));
    await expectDuplicateKey(Submission.create(makeSubmission({ cfSubmissionId: 42 })), ['cfSubmissionId']);
  });

  it('indexes userId + submittedAt descending and returns newest first', async () => {
    const userId = objectId();
    await Submission.create([
      makeSubmission({ userId, submittedAt: new Date('2026-01-01') }),
      makeSubmission({ userId, submittedAt: new Date('2026-03-01') }),
    ]);
    const indexes = await indexesByName(Submission);
    expect(indexes['userId_1_submittedAt_-1'].key).toEqual({ userId: 1, submittedAt: -1 });
    const [latest] = await Submission.find({ userId }).sort({ submittedAt: -1 }).lean();
    expect(latest.submittedAt.toISOString()).toBe('2026-03-01T00:00:00.000Z');
  });

  it('toJSON removes __v', async () => {
    expect((await Submission.create(makeSubmission())).toJSON()).not.toHaveProperty('__v');
  });
});
