import { describe, expect, it } from 'vitest';
import { Submission } from '../../../../src/modules/sync/submission.model.js';
import { useTestDB } from '../../../helpers/db.js';
import { cfHistory, cfSubmission, cfUser, fakeCfClient } from '../../../helpers/codeforces.js';
import { createLinkedUser, createTestSyncService, reloadUser } from '../../../helpers/sync.js';
import { toSubmissionDoc } from '../../../../src/modules/sync/helpers/cfSubmissions.js';

useTestDB();

const users = { ada_l: cfUser('Ada_L') };

describe('syncUser — incremental', () => {
  it('stops at the page containing lastSubmissionId and stores only newer ones', async () => {
    const client = fakeCfClient({ users, submissions: cfHistory(40) });
    const user = await createLinkedUser({ lastSubmissionId: 33 });
    const result = await createTestSyncService(client).syncUser(user._id);
    expect(client.userStatus).toHaveBeenCalledTimes(2);
    expect(result).toMatchObject({ newSubmissions: 7, totalSubmissions: 7 });
    expect((await reloadUser(user._id)).lastSubmissionId).toBe(40);
  });

  it('fetches one page and inserts nothing when there is nothing new', async () => {
    const client = fakeCfClient({ users, submissions: cfHistory(10) });
    const user = await createLinkedUser({ lastSubmissionId: 10 });
    const result = await createTestSyncService(client).syncUser(user._id);
    expect(client.userStatus).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({ newSubmissions: 0, totalSubmissions: 0 });
  });

  it('ignores submissions that are already stored', async () => {
    const user = await createLinkedUser();
    await Submission.insertMany(cfHistory(3).map(toSubmissionDoc(user._id)));
    const result = await createTestSyncService(fakeCfClient({ users, submissions: cfHistory(5) })).syncUser(user._id);
    expect(result).toMatchObject({ newSubmissions: 2, totalSubmissions: 5 });
  });

  it('picks up a submission once its verdict arrives', async () => {
    const user = await createLinkedUser();
    const pending = [cfSubmission(3), cfSubmission(2, { verdict: 'TESTING' }), cfSubmission(1)];
    await createTestSyncService(fakeCfClient({ users, submissions: pending })).syncUser(user._id);
    expect((await reloadUser(user._id)).lastSubmissionId).toBe(1);
    const judged = [cfSubmission(3), cfSubmission(2, { verdict: 'WRONG_ANSWER' }), cfSubmission(1)];
    const result = await createTestSyncService(fakeCfClient({ users, submissions: judged })).syncUser(user._id);
    expect(result).toMatchObject({ newSubmissions: 1, totalSubmissions: 3 });
    expect((await reloadUser(user._id)).lastSubmissionId).toBe(3);
  });
});
