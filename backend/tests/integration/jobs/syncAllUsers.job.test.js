import { describe, expect, it, vi } from 'vitest';
import { User } from '../../../src/modules/users/user.model.js';
import { createSyncAllUsersJob } from '../../../src/jobs/syncAllUsers.job.js';
import { useTestDB } from '../../helpers/db.js';
import { makeUser } from '../../helpers/factories.js';

useTestDB();

const seed = () => User.create([
  makeUser({ cfHandle: 'alpha' }),
  makeUser({ cfHandle: 'beta' }),
  makeUser(),
  makeUser({ cfHandle: 'gamma' }),
]);

describe('syncAllUsers job', () => {
  it('syncs only users with a handle, one after another', async () => {
    await seed();
    const order = [];
    let active = 0;
    const syncUser = vi.fn(async (id) => {
      active += 1;
      expect(active).toBe(1);
      order.push(String(id));
      await new Promise((resolve) => setImmediate(resolve));
      active -= 1;
      return { newSubmissions: 2 };
    });
    const summary = await createSyncAllUsersJob({ syncService: { syncUser } }).run();
    expect(summary).toEqual({ users: 3, synced: 3, failed: 0, newSubmissions: 6 });
    expect(new Set(order).size).toBe(3);
  });

  it('logs a failing user through jobErrorHandler and continues with the next', async () => {
    const [alpha] = await seed();
    const boom = new Error('CF down');
    const syncUser = vi.fn(async (id) => {
      if (String(id) === String(alpha._id)) throw boom;
      return { newSubmissions: 1 };
    });
    const onError = vi.fn();
    const summary = await createSyncAllUsersJob({ syncService: { syncUser }, onError }).run();
    expect(syncUser).toHaveBeenCalledTimes(3);
    expect(summary).toEqual({ users: 3, synced: 2, failed: 1, newSubmissions: 2 });
    expect(onError).toHaveBeenCalledExactlyOnceWith(boom, { job: 'syncAllUsers', userId: String(alpha._id) });
  });

  it('never rejects when listing users fails', async () => {
    const boom = new Error('db down');
    const failingUser = { find: () => ({ lean: async () => { throw boom; } }) };
    const onError = vi.fn();
    const summary = await createSyncAllUsersJob({ syncService: {}, User: failingUser, onError }).run();
    expect(summary).toMatchObject({ users: 0, synced: 0 });
    expect(onError).toHaveBeenCalledWith(boom, { job: 'syncAllUsers' });
  });

  it('skips a run that starts while another is in progress', async () => {
    await User.create(makeUser({ cfHandle: 'alpha' }));
    let release;
    const syncUser = vi.fn(async () => ({ newSubmissions: 0 }))
      .mockImplementationOnce(() => new Promise((resolve) => { release = () => resolve({ newSubmissions: 0 }); }));
    const logger = { info: vi.fn(), error: vi.fn() };
    const job = createSyncAllUsersJob({ syncService: { syncUser }, logger });
    const first = job.run();
    await vi.waitFor(() => expect(syncUser).toHaveBeenCalled());
    expect(await job.run()).toEqual({ skipped: true });
    release();
    expect((await first).synced).toBe(1);
    expect(await job.run()).toMatchObject({ synced: 1 });
  });
});
