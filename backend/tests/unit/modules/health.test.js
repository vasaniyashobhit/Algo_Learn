import { describe, expect, it, vi } from 'vitest';
import { getHealth } from '../../../src/modules/health/health.controller.js';
import { healthRouter } from '../../../src/modules/health/health.routes.js';

describe('health.controller', () => {
  it('responds with ok status', async () => {
    const res = { json: vi.fn() };
    await getHealth({}, res, vi.fn());
    expect(res.json.mock.calls[0][0]).toMatchObject({ success: true, data: { status: 'ok' } });
  });

  it('forwards unexpected errors to next', async () => {
    const err = new Error('socket closed');
    const res = { json: vi.fn(() => { throw err; }) };
    const next = vi.fn();
    await getHealth({}, res, next);
    expect(next).toHaveBeenCalledWith(err);
  });
});

describe('health.routes', () => {
  it('registers GET /', () => {
    const route = healthRouter.stack.find((layer) => layer.route?.path === '/')?.route;
    expect(route?.methods).toEqual({ get: true });
  });
});
