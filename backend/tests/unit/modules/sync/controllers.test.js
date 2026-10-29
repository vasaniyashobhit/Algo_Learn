import { describe, expect, it, vi } from 'vitest';
import { createSyncController } from '../../../../src/modules/sync/sync.controller.js';
import { createHandleController } from '../../../../src/modules/users/handle.controller.js';
import { createInternalController } from '../../../../src/modules/internal/internal.controller.js';

const req = { user: { id: 'u1' }, body: { handle: 'tourist' } };
const res = () => {
  const response = { json: vi.fn(), status: vi.fn(() => response) };
  return response;
};

describe('sync and handle controllers', () => {
  const syncService = { syncUser: vi.fn() };
  const handleService = { linkHandle: vi.fn(), unlinkHandle: vi.fn() };
  const { syncMe } = createSyncController({ syncService });
  const { linkHandle, unlinkHandle } = createHandleController({ handleService });

  it.each([
    ['syncMe', syncMe, syncService, 'syncUser', ['u1']],
    ['linkHandle', linkHandle, handleService, 'linkHandle', ['u1', 'tourist']],
    ['unlinkHandle', unlinkHandle, handleService, 'unlinkHandle', ['u1']],
  ])('%s sends the service result', async (_name, handler, service, method, args) => {
    service[method].mockResolvedValueOnce({ ok: 1 });
    const response = res();
    await handler(req, response, vi.fn());
    expect(service[method]).toHaveBeenCalledWith(...args);
    expect(response.json).toHaveBeenCalledWith({ success: true, data: { ok: 1 } });
  });

  it.each([
    ['syncMe', syncMe, syncService, 'syncUser'],
    ['linkHandle', linkHandle, handleService, 'linkHandle'],
    ['unlinkHandle', unlinkHandle, handleService, 'unlinkHandle'],
  ])('%s forwards errors to next', async (_name, handler, service, method) => {
    const err = new Error('boom');
    service[method].mockRejectedValueOnce(err);
    const next = vi.fn();
    const response = res();
    await handler(req, response, next);
    expect(next).toHaveBeenCalledWith(err);
    expect(response.json).not.toHaveBeenCalled();
  });
});

describe('internal controller', () => {
  it('forwards a synchronous failure to start the job to next', async () => {
    const err = new Error('cannot start');
    const { syncAll } = createInternalController({ syncAllUsersJob: { run: () => { throw err; } } });
    const next = vi.fn();
    await syncAll(req, res(), next);
    expect(next).toHaveBeenCalledWith(err);
  });
});
