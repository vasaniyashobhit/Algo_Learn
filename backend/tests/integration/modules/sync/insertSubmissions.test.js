import { describe, expect, it } from 'vitest';
import { Submission } from '../../../../src/modules/sync/submission.model.js';
import { insertIgnoringDuplicates } from '../../../../src/modules/sync/helpers/insertSubmissions.js';
import { useTestDB } from '../../../helpers/db.js';
import { makeSubmission } from '../../../helpers/factories.js';

useTestDB();

describe('insertIgnoringDuplicates', () => {
  it('returns 0 and writes nothing for an empty list', async () => {
    expect(await insertIgnoringDuplicates(Submission, [])).toBe(0);
  });

  it('inserts every new submission', async () => {
    expect(await insertIgnoringDuplicates(Submission, [makeSubmission(), makeSubmission()])).toBe(2);
  });

  it('skips duplicates and still inserts the rest (ordered: false)', async () => {
    const existing = makeSubmission();
    await Submission.create(existing);
    const docs = [makeSubmission(), { ...existing }, makeSubmission()];
    expect(await insertIgnoringDuplicates(Submission, docs)).toBe(2);
    expect(await Submission.countDocuments()).toBe(3);
  });

  it('returns 0 when every submission is already stored', async () => {
    const existing = makeSubmission();
    await Submission.create(existing);
    expect(await insertIgnoringDuplicates(Submission, [{ ...existing }])).toBe(0);
  });

  it('wraps any other failure in a 500 AppError with the cause', async () => {
    const cause = new Error('connection lost');
    const model = { insertMany: async () => { throw cause; } };
    await expect(insertIgnoringDuplicates(model, [makeSubmission()]))
      .rejects.toMatchObject({ statusCode: 500, code: 'INTERNAL_ERROR', cause });
  });

  it('does not treat a mix of duplicate and other write errors as duplicates', async () => {
    const err = Object.assign(new Error('bulk'), { writeErrors: [{ code: 11000 }, { code: 121 }] });
    const model = { insertMany: async () => { throw err; } };
    await expect(insertIgnoringDuplicates(model, [makeSubmission()])).rejects.toMatchObject({ code: 'INTERNAL_ERROR' });
  });
});
