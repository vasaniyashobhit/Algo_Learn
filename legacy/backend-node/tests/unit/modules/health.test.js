import { describe, expect, it, vi } from 'vitest';
import { dbState, getHealth, getReady } from '../../../src/modules/health/health.controller.js';
import { healthRouter } from '../../../src/modules/health/health.routes.js';

describe('health.controller', () => {
  it('responds with a status and the database state (no DB in unit tests: degraded)', async () => {
    const res = { json: vi.fn() };
    await getHealth({}, res, vi.fn());
    expect(res.json.mock.calls[0][0]).toMatchObject({ success: true, data: { status: 'degraded', db: 'down' } });
  });

  it('reads the database state from the connection', () => {
    expect(dbState({ readyState: 1 })).toBe('up');
    expect(dbState({ readyState: 2 })).toBe('down');
    expect(dbState({ readyState: 0 })).toBe('down');
  });

  it('forwards unexpected errors to next', async () => {
    const err = new Error('socket closed');
    const res = { json: vi.fn(() => { throw err; }) };
    const next = vi.fn();
    await getHealth({}, res, next);
    expect(next).toHaveBeenCalledWith(err);
  });

  it('readiness forwards a 503 DB_UNAVAILABLE while the database is down', async () => {
    const next = vi.fn();
    await getReady({}, { json: vi.fn() }, next);
    expect(next.mock.calls[0][0]).toMatchObject({ statusCode: 503, code: 'DB_UNAVAILABLE' });
  });
});

describe('health.routes', () => {
  it('registers GET / and GET /ready', () => {
    const paths = healthRouter.stack.map((layer) => [layer.route?.path, layer.route?.methods]);
    expect(paths).toEqual([['/', { get: true }], ['/ready', { get: true }]]);
  });
});
