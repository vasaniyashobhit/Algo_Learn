import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { NotFoundError } from '../../../src/errors/httpErrors.js';
import { createThrowingApp } from '../../helpers/testApp.js';

const prod = { isProduction: true };

describe('errorHandler (production)', () => {
  it('hides stack traces and internal messages for unknown errors', async () => {
    const err = new Error('mongodb+srv://admin:hunter2@cluster refused');
    const res = await request(createThrowingApp(err, prod)).get('/boom');
    expect(res.status).toBe(500);
    expect(res.body).toEqual({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Something went wrong on our side',
        details: null,
        requestId: res.headers['x-request-id'],
      },
    });
    expect(res.text).not.toContain('hunter2');
    expect(res.text).not.toContain('at ');
  });

  it('keeps typed AppError messages and details but no stack', async () => {
    const err = new NotFoundError('PROBLEM_NOT_FOUND', 'Problem 9999/Z not found', { id: '9999/Z' });
    const res = await request(createThrowingApp(err, prod)).get('/boom');
    expect(res.status).toBe(404);
    expect(res.body.error).toEqual({
      code: 'PROBLEM_NOT_FOUND',
      message: 'Problem 9999/Z not found',
      details: { id: '9999/Z' },
      requestId: expect.any(String),
    });
  });

  it('maps library errors (malformed JSON) without leaking parser output', async () => {
    const app = createThrowingApp(new Error('unused'), prod);
    const res = await request(app).post('/boom').set('Content-Type', 'application/json').send('{"a":');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_FAILED');
    expect(res.body.error.stack).toBeUndefined();
  });
});
