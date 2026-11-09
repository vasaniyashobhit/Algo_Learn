import { describe, expect, it, vi } from 'vitest';
import { createCodeforcesClient } from '../../../../src/modules/codeforces/codeforces.client.js';
import { ExternalServiceError, NotFoundError } from '../../../../src/errors/httpErrors.js';

const body = (json, status = 200) => new Response(JSON.stringify(json), { status });
const ok = (result) => body({ status: 'OK', result });
const passThrough = async (task) => task();

/** fetchImpl that answers with the given responses (or throws errors) in order. */
const sequence = (...steps) => {
  const queue = [...steps];
  return vi.fn(async (_url, { signal }) => {
    const step = queue.shift();
    if (step === 'hang') {
      return new Promise((_resolve, reject) => signal.addEventListener('abort', () => reject(signal.reason)));
    }
    if (step instanceof Error) throw step;
    return step;
  });
};

const client = (fetchImpl, options = {}) => createCodeforcesClient({
  fetchImpl, limiter: vi.fn(passThrough), sleep: async () => {}, ...options,
});

describe('codeforces client (errors)', () => {
  it('maps "status":"FAILED" to a typed error without retrying', async () => {
    const fetchImpl = sequence(body({ status: 'FAILED', comment: 'handles: User with handle zz not found' }, 400));
    const err = await client(fetchImpl).userInfo('zz').catch((e) => e);
    expect(err).toBeInstanceOf(NotFoundError);
    expect(err.code).toBe('CF_HANDLE_NOT_FOUND');
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('times out as a 503 CF_UNAVAILABLE and retries', async () => {
    const fetchImpl = sequence('hang', ok([1]));
    const warn = vi.fn();
    const result = await client(fetchImpl, { timeoutMs: 20, logger: { warn } }).userStatus('x');
    expect(result).toEqual([1]);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(warn).toHaveBeenCalledWith(expect.objectContaining({ method: 'user.status', attempt: 1 }), 'Retrying Codeforces call');
  });

  it('gives up after the configured retries with the last typed error', async () => {
    const fetchImpl = sequence('hang', 'hang', 'hang');
    const err = await client(fetchImpl, { timeoutMs: 10, retries: 2 }).problemsetProblems().catch((e) => e);
    expect(err).toBeInstanceOf(ExternalServiceError);
    expect(err).toMatchObject({ statusCode: 503, code: 'CF_UNAVAILABLE', details: { reason: 'timeout' } });
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });

  it('retries 5xx, network errors and call-limit failures, then succeeds', async () => {
    const fetchImpl = sequence(
      new Response('<html>502</html>', { status: 502 }),
      new TypeError('fetch failed'),
      body({ status: 'FAILED', comment: 'Call limit exceeded' }, 429),
      ok({ problems: [] }),
    );
    expect(await client(fetchImpl, { retries: 3 }).problemsetProblems()).toEqual({ problems: [] });
    expect(fetchImpl).toHaveBeenCalledTimes(4);
  });

  it('does not retry non-retryable 4xx answers', async () => {
    const fetchImpl = sequence(new Response('forbidden', { status: 403 }));
    await expect(client(fetchImpl).problemsetProblems()).rejects.toMatchObject({ statusCode: 502, details: { status: 403 } });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('sends every attempt (including retries) through the limiter', async () => {
    const limiter = vi.fn(passThrough);
    const fetchImpl = sequence(new Response('', { status: 500 }), ok([]));
    await client(fetchImpl, { limiter }).userStatus('x');
    expect(limiter).toHaveBeenCalledTimes(2);
  });
});
