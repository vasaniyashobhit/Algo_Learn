import { describe, expect, it, vi } from 'vitest';
import { createAuthController } from '../../../../src/modules/auth/auth.controller.js';
import { createAuthRouter } from '../../../../src/modules/auth/auth.routes.js';
import { getMe } from '../../../../src/modules/users/users.controller.js';

const mockRes = () => {
  const res = { json: vi.fn() };
  res.status = vi.fn(() => res);
  return res;
};

const result = { token: 'a.b.c', user: { id: '1', email: 'a@b.co' } };

describe('auth.controller', () => {
  it('signup answers 201 with the service result', async () => {
    const authService = { signup: vi.fn().mockResolvedValueOnce(result) };
    const res = mockRes();
    await createAuthController({ authService }).signup({ body: { email: 'a@b.co' } }, res, vi.fn());
    expect(authService.signup).toHaveBeenCalledWith({ email: 'a@b.co' });
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ success: true, data: result });
  });

  it('login answers 200 with the service result', async () => {
    const authService = { login: vi.fn().mockResolvedValueOnce(result) };
    const res = mockRes();
    await createAuthController({ authService }).login({ body: {} }, res, vi.fn());
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ success: true, data: result });
  });

  it.each(['signup', 'login'])('%s forwards service errors to next', async (action) => {
    const err = new Error('boom');
    const authService = { [action]: vi.fn().mockRejectedValueOnce(err) };
    const next = vi.fn();
    const res = mockRes();
    await createAuthController({ authService })[action]({ body: {} }, res, next);
    expect(next).toHaveBeenCalledWith(err);
    expect(res.json).not.toHaveBeenCalled();
  });

  it('me reuses the users profile handler', () => {
    expect(createAuthController({ authService: {} }).me).toBe(getMe);
  });
});

describe('auth.routes', () => {
  it('registers signup, login and me', () => {
    const router = createAuthRouter({ authService: {}, requireAuth: vi.fn() });
    const routes = router.stack.filter((layer) => layer.route).map((layer) => [layer.route.path, layer.route.methods]);
    expect(routes).toEqual([
      ['/signup', { post: true }],
      ['/login', { post: true }],
      ['/me', { get: true }],
    ]);
  });
});
