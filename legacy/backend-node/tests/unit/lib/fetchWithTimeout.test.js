import { describe, expect, it, vi } from 'vitest';
import { createFetchWithTimeout, fetchWithTimeout } from '../../../src/lib/fetchWithTimeout.js';
import { ExternalServiceError } from '../../../src/errors/httpErrors.js';

/** A fake fetch that never resolves on its own, only rejects when its signal aborts. */
const hangingFetch = vi.fn((_url, { signal }) => new Promise((_resolve, reject) => {
  signal.addEventListener('abort', () => reject(signal.reason));
}));

const catchError = async (promise) => {
  try {
    await promise;
  } catch (err) {
    return err;
  }
  throw new Error('expected rejection');
};

describe('fetchWithTimeout', () => {
  it('passes url and init through and returns the response', async () => {
    const response = { ok: true };
    const fetchImpl = vi.fn(async () => response);
    const fetcher = createFetchWithTimeout({ fetchImpl });
    expect(await fetcher('https://x.test', { method: 'POST' })).toBe(response);
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe('https://x.test');
    expect(init.method).toBe('POST');
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it('throws a 503 ExternalServiceError on timeout', async () => {
    const fetcher = createFetchWithTimeout({ fetchImpl: hangingFetch, timeoutMs: 20, errorCode: 'CF_UNAVAILABLE' });
    const err = await catchError(fetcher('https://slow.test'));
    expect(err).toBeInstanceOf(ExternalServiceError);
    expect(err).toMatchObject({ statusCode: 503, code: 'CF_UNAVAILABLE', details: { reason: 'timeout', timeoutMs: 20 } });
    expect(err.cause).toBeDefined();
  });

  it('allows a per-call timeout override', async () => {
    const fetcher = createFetchWithTimeout({ fetchImpl: hangingFetch, timeoutMs: 60_000 });
    const err = await catchError(fetcher('https://slow.test', { timeoutMs: 10 }));
    expect(err.details).toEqual({ reason: 'timeout', timeoutMs: 10 });
  });

  it('wraps network failures as 502 URL_FETCH_FAILED with the cause', async () => {
    const cause = new TypeError('fetch failed');
    const fetcher = createFetchWithTimeout({ fetchImpl: async () => { throw cause; } });
    const err = await catchError(fetcher('https://down.test'));
    expect(err).toMatchObject({ statusCode: 502, code: 'URL_FETCH_FAILED', details: { reason: 'network' } });
    expect(err.cause).toBe(cause);
  });

  it('honours a caller abort signal', async () => {
    const controller = new AbortController();
    const fetcher = createFetchWithTimeout({ fetchImpl: hangingFetch, timeoutMs: 60_000 });
    const pending = catchError(fetcher('https://x.test', { signal: controller.signal }));
    controller.abort();
    expect((await pending).details).toEqual({ reason: 'aborted' });
  });

  it('exports a ready-made default instance', () => {
    expect(typeof fetchWithTimeout).toBe('function');
  });
});
