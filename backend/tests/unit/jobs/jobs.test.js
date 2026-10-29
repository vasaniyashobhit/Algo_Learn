import { describe, expect, it, vi } from 'vitest';
import { createJobErrorHandler } from '../../../src/jobs/jobErrorHandler.js';
import { createSyncProblemsetJob } from '../../../src/jobs/syncProblemset.job.js';

describe('jobErrorHandler', () => {
  it('logs the error with its context and does not throw', () => {
    const logger = { error: vi.fn() };
    const err = new Error('boom');
    expect(() => createJobErrorHandler(logger)(err, { job: 'syncAllUsers', userId: 'u1' })).not.toThrow();
    expect(logger.error).toHaveBeenCalledWith({ err, job: 'syncAllUsers', userId: 'u1' },
      'Background job failed: syncAllUsers');
  });

  it('copes with no context and no logger', () => {
    const logger = { error: vi.fn() };
    createJobErrorHandler(logger)(new Error('x'));
    expect(logger.error.mock.calls[0][1]).toBe('Background job failed: unknown job');
    expect(() => createJobErrorHandler()(new Error('x'))).not.toThrow();
  });
});

describe('syncProblemset job', () => {
  it('runs the problemset sync with the shared client and logs the summary', async () => {
    const client = {};
    const summary = { fetched: 10, inserted: 1, updated: 2 };
    const sync = vi.fn(async () => summary);
    const logger = { info: vi.fn() };
    const job = createSyncProblemsetJob({ client, logger, sync });
    expect(job.name).toBe('syncProblemset');
    expect(await job.run()).toBe(summary);
    expect(sync).toHaveBeenCalledWith({ client });
    expect(logger.info).toHaveBeenCalledWith({ job: 'syncProblemset', ...summary }, 'Job finished');
  });

  it('sends failures to jobErrorHandler and resolves to null', async () => {
    const boom = new Error('CF down');
    const onError = vi.fn();
    const job = createSyncProblemsetJob({ client: {}, onError, sync: async () => { throw boom; } });
    expect(await job.run()).toBeNull();
    expect(onError).toHaveBeenCalledWith(boom, { job: 'syncProblemset' });
  });

  it('logs failures through the default handler', async () => {
    const logger = { info: vi.fn(), error: vi.fn() };
    const job = createSyncProblemsetJob({ client: {}, logger, sync: async () => { throw new Error('x'); } });
    await job.run();
    expect(logger.error).toHaveBeenCalledOnce();
  });
});
