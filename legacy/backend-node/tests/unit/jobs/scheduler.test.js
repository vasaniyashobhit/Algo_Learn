import { describe, expect, it, vi } from 'vitest';
import { startScheduler } from '../../../src/jobs/scheduler.js';
import { PROBLEMSET_SYNC_CRON } from '../../../src/config/constants.js';

const jobs = () => ({
  syncAllUsers: { name: 'syncAllUsers', run: vi.fn() },
  syncProblemset: { name: 'syncProblemset', run: vi.fn() },
});

const fakeCron = () => {
  const scheduled = [];
  return {
    scheduled,
    schedule: vi.fn((expression, fn, options) => {
      const task = { expression, fn, options, stop: vi.fn() };
      scheduled.push(task);
      return task;
    }),
  };
};

describe('startScheduler', () => {
  it('does not start anything when NODE_ENV=test', async () => {
    const cron = fakeCron();
    const scheduler = startScheduler({ env: { NODE_ENV: 'test', SYNC_CRON: '* * * * *' }, jobs: jobs(), cron });
    expect(cron.schedule).not.toHaveBeenCalled();
    expect(scheduler.tasks).toEqual([]);
    await expect(scheduler.stop()).resolves.toBeUndefined();
  });

  it('schedules the user sync on SYNC_CRON and the problemset sync weekly', () => {
    const cron = fakeCron();
    const logger = { info: vi.fn() };
    startScheduler({ env: { NODE_ENV: 'production', SYNC_CRON: '0 */6 * * *' }, jobs: jobs(), cron, logger });
    expect(cron.scheduled.map(({ expression, options }) => [expression, options])).toEqual([
      ['0 */6 * * *', { name: 'syncAllUsers', noOverlap: true }],
      [PROBLEMSET_SYNC_CRON, { name: 'syncProblemset', noOverlap: true }],
    ]);
    expect(PROBLEMSET_SYNC_CRON).toBe('0 3 * * 0');
    expect(logger.info).toHaveBeenCalled();
  });

  it('runs the matching job when a task fires', () => {
    const cron = fakeCron();
    const all = jobs();
    startScheduler({ env: { NODE_ENV: 'development', SYNC_CRON: '0 */6 * * *' }, jobs: all, cron });
    cron.scheduled[0].fn();
    expect(all.syncAllUsers.run).toHaveBeenCalledOnce();
    cron.scheduled[1].fn();
    expect(all.syncProblemset.run).toHaveBeenCalledOnce();
  });

  it('stops every task', async () => {
    const cron = fakeCron();
    const scheduler = startScheduler({ env: { NODE_ENV: 'development', SYNC_CRON: '0 */6 * * *' }, jobs: jobs(), cron });
    await scheduler.stop();
    expect(cron.scheduled.every((task) => task.stop.mock.calls.length === 1)).toBe(true);
  });

  it('uses the real node-cron by default (and the tasks can be stopped)', async () => {
    const scheduler = startScheduler({ env: { NODE_ENV: 'development', SYNC_CRON: '0 */6 * * *' }, jobs: jobs() });
    expect(scheduler.tasks).toHaveLength(2);
    await scheduler.stop();
  });
});
