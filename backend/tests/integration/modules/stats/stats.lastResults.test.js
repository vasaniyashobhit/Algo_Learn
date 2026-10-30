import { describe, expect, it } from 'vitest';
import { useTestDB } from '../../../helpers/db.js';
import { createSyncedUser, createTestStatsService, insertSubmissions, statsOf } from '../../../helpers/stats.js';

useTestDB();

const service = createTestStatsService();

describe('topic stats lastResults', () => {
  it('stores the 5 newest attempted problems per topic, newest first', async () => {
    const user = await createSyncedUser();
    await insertSubmissions(user._id, [
      ['1/A', ['dp'], 1200, 'OK', 9],
      ['2/A', ['dp'], 1200, 'WRONG_ANSWER', 8],
      ['3/A', ['dp'], 1200, 'OK', 7],
      ['4/A', ['dp'], 1200, 'WRONG_ANSWER', 6],
      ['4/A', ['dp'], 1200, 'OK', 1], // solved later: the problem moves to the front, solved
      ['5/A', ['dp', 'math'], 1200, 'WRONG_ANSWER', 4],
      ['6/A', ['dp', 'math'], 1200, 'TIME_LIMIT_EXCEEDED', 3],
    ]);
    await service.recomputeForUser(user._id);
    const stats = await statsOf(user._id);
    expect(stats.dp.lastResults).toEqual([
      { problemId: '4/A', solved: true },
      { problemId: '6/A', solved: false },
      { problemId: '5/A', solved: false },
      { problemId: '3/A', solved: true },
      { problemId: '2/A', solved: false },
    ]);
    expect(stats['dp+math'].lastResults).toEqual([
      { problemId: '6/A', solved: false },
      { problemId: '5/A', solved: false },
    ]);
  });

  it('returns lastResults from getStats and the summary', async () => {
    const user = await createSyncedUser();
    await insertSubmissions(user._id, [
      ['1/A', ['dp'], 1200, 'OK', 2],
      ['2/A', ['dp'], 1200, 'WRONG_ANSWER', 1],
      ['3/A', ['dp'], 1200, 'WRONG_ANSWER', 0],
    ]);
    await service.recomputeForUser(user._id);
    const { items } = await service.getStats(user._id, { kind: 'single' });
    expect(items[0].lastResults).toEqual([
      { problemId: '3/A', solved: false },
      { problemId: '2/A', solved: false },
      { problemId: '1/A', solved: true },
    ]);
    const { data } = await service.getSummary(user._id);
    expect(data.weakest[0].lastResults).toHaveLength(3);
  });
});
