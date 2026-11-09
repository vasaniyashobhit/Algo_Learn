import { describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { notFound } from '../../../src/middlewares/notFound.js';
import { NotFoundError } from '../../../src/errors/httpErrors.js';
import { createMiniApp } from '../../helpers/testApp.js';

describe('notFound middleware', () => {
  it('forwards a ROUTE_NOT_FOUND NotFoundError', () => {
    const next = vi.fn();
    notFound({ method: 'GET', path: '/nope' }, {}, next);
    const [err] = next.mock.calls[0];
    expect(err).toBeInstanceOf(NotFoundError);
    expect(err.code).toBe('ROUTE_NOT_FOUND');
    expect(err.message).toBe('Route GET /nope not found');
  });

  it('produces a 404 error response through the error handler', async () => {
    const app = createMiniApp((a) => a.use(notFound));
    const res = await request(app).post('/missing?token=abc');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatchObject({ code: 'ROUTE_NOT_FOUND', message: 'Route POST /missing not found' });
    expect(res.body.error.requestId).toBe(res.headers['x-request-id']);
  });
});
