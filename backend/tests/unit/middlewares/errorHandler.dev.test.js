import { describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { ConflictError } from '../../../src/errors/httpErrors.js';
import { createErrorHandler } from '../../../src/middlewares/errorHandler.js';
import { createThrowingApp } from '../../helpers/testApp.js';

describe('errorHandler (development)', () => {
  it('sends the exact shared error shape for an AppError', async () => {
    const err = new ConflictError('PRACTICE_ITEM_EXISTS', 'Already in your list', { problemId: '1/A' });
    const res = await request(createThrowingApp(err)).get('/boom');
    expect(res.status).toBe(409);
    expect(res.body).toEqual({
      success: false,
      error: {
        code: 'PRACTICE_ITEM_EXISTS',
        message: 'Already in your list',
        details: { problemId: '1/A' },
        requestId: res.headers['x-request-id'],
        stack: expect.stringContaining('Already in your list'),
      },
    });
  });

  it('includes the original stack for unknown errors to help debugging', async () => {
    const res = await request(createThrowingApp(new Error('db exploded'))).get('/boom');
    expect(res.status).toBe(500);
    expect(res.body.error.code).toBe('INTERNAL_ERROR');
    expect(res.body.error.message).toBe('Something went wrong on our side');
    expect(res.body.error.stack).toContain('db exploded');
  });

  it('logs 5xx at error and 4xx at warn with the requestId', () => {
    const logger = { error: vi.fn(), warn: vi.fn() };
    const handler = createErrorHandler({ isProduction: false, logger });
    const res = { headersSent: false, status: vi.fn().mockReturnThis(), json: vi.fn() };
    handler(new Error('x'), { id: 'r1' }, res, vi.fn());
    handler(new ConflictError(), { id: 'r2' }, res, vi.fn());
    expect(logger.error).toHaveBeenCalledWith(expect.objectContaining({ requestId: 'r1' }), expect.any(String));
    expect(logger.warn).toHaveBeenCalledWith(expect.objectContaining({ code: 'DUPLICATE_RESOURCE' }), expect.any(String));
  });

  it('prefers the request-scoped logger when present', () => {
    const reqLog = { error: vi.fn() };
    const handler = createErrorHandler({ isProduction: false, logger: { error: vi.fn() } });
    const res = { headersSent: false, status: vi.fn().mockReturnThis(), json: vi.fn() };
    handler(new Error('x'), { id: 'r', log: reqLog }, res, vi.fn());
    expect(reqLog.error).toHaveBeenCalledOnce();
  });

  it('delegates to Express when headers were already sent', () => {
    const handler = createErrorHandler({ isProduction: false, logger: { error: vi.fn() } });
    const res = { headersSent: true, status: vi.fn(), json: vi.fn() };
    const next = vi.fn();
    const err = new Error('late');
    handler(err, { id: 'r' }, res, next);
    expect(next).toHaveBeenCalledWith(err);
    expect(res.status).not.toHaveBeenCalled();
  });
});
