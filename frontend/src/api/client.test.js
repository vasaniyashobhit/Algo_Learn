import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { errorBody } from '../test/fixtures.js';
import { server } from '../test/msw/server.js';
import { createApiClient, DEFAULT_TIMEOUT_MS } from './client.js';

const setup = (token = 'tok') => {
  const onSessionEnded = vi.fn();
  const client = createApiClient({ getToken: () => token, onSessionEnded, baseURL: '' });
  return { client, onSessionEnded };
};

const replyWith = (status, body) => server.use(http.get('*/api/v1/x', () => HttpResponse.json(body, { status })));

describe('api client', () => {
  it('sends the Bearer token and uses a 15 s default timeout', async () => {
    let seen;
    server.use(
      http.get('*/api/v1/x', ({ request }) => {
        seen = request.headers.get('authorization');
        return HttpResponse.json({ success: true, data: 1 });
      }),
    );
    const { client } = setup('abc');
    await client.get('/api/v1/x');
    expect(seen).toBe('Bearer abc');
    expect(client.defaults.timeout).toBe(DEFAULT_TIMEOUT_MS);
    expect(DEFAULT_TIMEOUT_MS).toBe(15_000);
  });

  it('sends no Authorization header without a token', async () => {
    let seen = 'unset';
    server.use(
      http.get('*/api/v1/x', ({ request }) => {
        seen = request.headers.get('authorization');
        return HttpResponse.json({ success: true });
      }),
    );
    await setup(null).client.get('/api/v1/x');
    expect(seen).toBeNull();
  });

  it('turns an error envelope into an ApiError', async () => {
    replyWith(409, errorBody('AUTH_EMAIL_TAKEN', 'An account with this email already exists', null, 'r-1'));
    await expect(setup().client.get('/api/v1/x')).rejects.toMatchObject({
      name: 'ApiError',
      status: 409,
      code: 'AUTH_EMAIL_TAKEN',
      requestId: 'r-1',
    });
  });

  it.each(['AUTH_TOKEN_EXPIRED', 'AUTH_INVALID_TOKEN'])('ends the session on 401 %s', async (code) => {
    replyWith(401, errorBody(code, 'nope'));
    const { client, onSessionEnded } = setup();
    await expect(client.get('/api/v1/x')).rejects.toMatchObject({ code });
    expect(onSessionEnded).toHaveBeenCalledTimes(1);
  });

  it('keeps the session for wrong credentials or when no token was sent', async () => {
    replyWith(401, errorBody('AUTH_INVALID_CREDENTIALS', 'Invalid email or password'));
    const first = setup();
    await expect(first.client.get('/api/v1/x')).rejects.toMatchObject({ code: 'AUTH_INVALID_CREDENTIALS' });
    expect(first.onSessionEnded).not.toHaveBeenCalled();
    replyWith(401, errorBody('AUTH_INVALID_TOKEN', 'nope'));
    const anonymous = setup(null);
    await expect(anonymous.client.get('/api/v1/x')).rejects.toMatchObject({ code: 'AUTH_INVALID_TOKEN' });
    expect(anonymous.onSessionEnded).not.toHaveBeenCalled();
  });

  it('marks network failures', async () => {
    server.use(http.get('*/api/v1/x', () => HttpResponse.error()));
    await expect(setup().client.get('/api/v1/x')).rejects.toMatchObject({ isNetwork: true, status: 0 });
  });

  it('honours a per-request timeout override and marks timeouts', async () => {
    // MSW's XHR interceptor does not enforce axios timeouts, so an adapter plays the slow server.
    let seenTimeout;
    const adapter = async (config) => {
      seenTimeout = config.timeout;
      throw Object.assign(new Error('timeout of 20ms exceeded'), { code: 'ECONNABORTED', config });
    };
    await expect(setup().client.get('/api/v1/x', { timeout: 20, adapter })).rejects.toMatchObject({ isTimeout: true });
    expect(seenTimeout).toBe(20);
  });
});
