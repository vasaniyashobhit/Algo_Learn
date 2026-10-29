import { describe, expect, it, vi } from 'vitest';
import { getMe, updateMe } from '../../../../src/modules/users/users.controller.js';
import * as usersService from '../../../../src/modules/users/users.service.js';
import { createUsersRouter } from '../../../../src/modules/users/users.routes.js';
import { updateMeSchema } from '../../../../src/modules/users/users.schema.js';

vi.mock('../../../../src/modules/users/users.service.js', () => ({
  getProfile: vi.fn(),
  updateProfile: vi.fn(),
}));

const profile = { id: '1', email: 'a@b.co', name: 'Ada' };
const req = { user: { id: '1', email: 'a@b.co' }, body: { name: 'Ada' } };

describe('users.controller', () => {
  it('getMe sends the profile of req.user', async () => {
    usersService.getProfile.mockResolvedValueOnce(profile);
    const res = { json: vi.fn() };
    await getMe(req, res, vi.fn());
    expect(usersService.getProfile).toHaveBeenCalledWith('1');
    expect(res.json).toHaveBeenCalledWith({ success: true, data: profile });
  });

  it('updateMe passes the validated body', async () => {
    usersService.updateProfile.mockResolvedValueOnce(profile);
    const res = { json: vi.fn() };
    await updateMe(req, res, vi.fn());
    expect(usersService.updateProfile).toHaveBeenCalledWith('1', { name: 'Ada' });
    expect(res.json).toHaveBeenCalledWith({ success: true, data: profile });
  });

  it.each([
    ['getMe', getMe, 'getProfile'],
    ['updateMe', updateMe, 'updateProfile'],
  ])('%s forwards errors to next', async (_name, handler, method) => {
    const err = new Error('boom');
    usersService[method].mockRejectedValueOnce(err);
    const next = vi.fn();
    const res = { json: vi.fn() };
    await handler(req, res, next);
    expect(next).toHaveBeenCalledWith(err);
    expect(res.json).not.toHaveBeenCalled();
  });
});

describe('users.routes and schema', () => {
  it('registers GET and PATCH /me', () => {
    const router = createUsersRouter({ requireAuth: vi.fn() });
    const routes = router.stack.filter((layer) => layer.route).map((layer) => [layer.route.path, layer.route.methods]);
    expect(routes).toEqual([['/me', { get: true }], ['/me', { patch: true }]]);
  });

  it('accepts only a valid name', () => {
    expect(updateMeSchema.parse({ name: '  Ada ' })).toEqual({ name: 'Ada' });
    expect(updateMeSchema.safeParse({ name: 'Ada', email: 'x@y.z' }).success).toBe(false);
    expect(updateMeSchema.safeParse({}).success).toBe(false);
  });
});
