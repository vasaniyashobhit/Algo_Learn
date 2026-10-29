import { describe, expect, it } from 'vitest';
import { CF_API_BASE_URL, buildCfUrl, parseCfResponse } from '../../../../src/modules/codeforces/helpers/cfRequest.js';

const jsonResponse = (body, status = 200) => new Response(JSON.stringify(body), { status });

describe('buildCfUrl', () => {
  it('builds the method URL with encoded params and skips null/undefined', () => {
    expect(buildCfUrl(CF_API_BASE_URL, 'user.status', { handle: 'tourist', from: 1, count: undefined, x: null }))
      .toBe('https://codeforces.com/api/user.status?handle=tourist&from=1');
  });

  it('joins arrays with ";" and tolerates a trailing slash on the base', () => {
    expect(buildCfUrl('https://cf.test/api/', 'user.info', { handles: ['a', 'b'] }))
      .toBe('https://cf.test/api/user.info?handles=a%3Bb');
    expect(buildCfUrl('https://cf.test/api', 'problemset.problems')).toBe('https://cf.test/api/problemset.problems');
  });
});

describe('parseCfResponse', () => {
  it('returns result for an OK body', async () => {
    expect(await parseCfResponse(jsonResponse({ status: 'OK', result: [1, 2] }))).toEqual([1, 2]);
  });

  it('throws the mapped FAILED error even when CF answers HTTP 400', async () => {
    const response = jsonResponse({ status: 'FAILED', comment: 'handles: User with handle q not found' }, 400);
    await expect(parseCfResponse(response)).rejects.toMatchObject({ code: 'CF_HANDLE_NOT_FOUND' });
  });

  it('throws a retryable error for an HTML 5xx page', async () => {
    const response = new Response('<html>down</html>', { status: 503 });
    await expect(parseCfResponse(response)).rejects.toMatchObject({ statusCode: 503, details: { status: 503, retryable: true } });
  });

  it('throws a 502 for unreadable or unexpected 200 bodies', async () => {
    await expect(parseCfResponse(new Response('nope'))).rejects.toMatchObject({ statusCode: 502, code: 'CF_UNAVAILABLE' });
    await expect(parseCfResponse(jsonResponse({ hello: 1 }))).rejects.toMatchObject({ statusCode: 502 });
  });
});
