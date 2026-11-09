import { describe, expect, it, vi } from 'vitest';

vi.mock('../../../src/scripts/import/syncNewProblems.js', () => ({
  syncNewProblems: vi.fn(async () => ({ fetched: 1, inserted: 1 })),
}));

const { syncProblemsetTask } = await import('../../../src/scripts/syncProblemset.js');
const { syncNewProblems } = await import('../../../src/scripts/import/syncNewProblems.js');

describe('syncProblemsetTask', () => {
  it('runs the sync with the given client and returns its summary', async () => {
    const client = { problemsetProblems: vi.fn() };
    const logger = { info: vi.fn() };
    expect(await syncProblemsetTask({ client, logger })).toEqual({ fetched: 1, inserted: 1 });
    expect(syncNewProblems).toHaveBeenCalledWith({ client });
    expect(logger.info).toHaveBeenCalled();
  });

  it('builds a real Codeforces client by default', async () => {
    await syncProblemsetTask();
    const { client } = syncNewProblems.mock.calls.at(-1)[0];
    expect(Object.keys(client)).toEqual(['problemsetProblems', 'userInfo', 'userStatus']);
  });
});
