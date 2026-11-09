import { describe, expect, it, vi } from 'vitest';
import { CF_MIN_INTERVAL_MS, createCodeforcesClient } from '../../../../src/modules/codeforces/codeforces.client.js';

const ok = (result) => new Response(JSON.stringify({ status: 'OK', result }));
const passThrough = async (task) => task();

const setup = (result = []) => {
  const fetchImpl = vi.fn(async () => ok(result));
  const limiter = vi.fn(passThrough);
  const client = createCodeforcesClient({ fetchImpl, limiter, baseUrl: 'https://cf.test/api' });
  return { client, fetchImpl, limiter, urlOf: (n = 0) => fetchImpl.mock.calls[n][0] };
};

describe('codeforces client (success)', () => {
  it('uses 2.1 s spacing by default (CF allows 1 call per 2 s)', () => {
    expect(CF_MIN_INTERVAL_MS).toBe(2_100);
    expect(Object.keys(createCodeforcesClient())).toEqual(['problemsetProblems', 'userInfo', 'userStatus']);
  });

  it('problemsetProblems calls problemset.problems and returns the result', async () => {
    const result = { problems: [{ contestId: 1, index: 'A' }], problemStatistics: [] };
    const { client, urlOf, limiter } = setup(result);
    expect(await client.problemsetProblems()).toEqual(result);
    expect(urlOf()).toBe('https://cf.test/api/problemset.problems');
    expect(limiter).toHaveBeenCalledTimes(1);
  });

  it('problemsetProblems can filter by tags', async () => {
    const { client, urlOf } = setup({ problems: [] });
    await client.problemsetProblems(['dp', 'math']);
    expect(urlOf()).toBe('https://cf.test/api/problemset.problems?tags=dp%3Bmath');
  });

  it('userInfo accepts one handle or many', async () => {
    const { client, urlOf } = setup([{ handle: 'tourist' }]);
    expect(await client.userInfo('tourist')).toEqual([{ handle: 'tourist' }]);
    await client.userInfo(['a', 'b']);
    expect(urlOf(0)).toBe('https://cf.test/api/user.info?handles=tourist');
    expect(urlOf(1)).toBe('https://cf.test/api/user.info?handles=a%3Bb');
  });

  it('userStatus passes handle, from and count (from defaults to 1)', async () => {
    const { client, urlOf } = setup([]);
    await client.userStatus('tourist', 101, 100);
    await client.userStatus('tourist');
    expect(urlOf(0)).toBe('https://cf.test/api/user.status?handle=tourist&from=101&count=100');
    expect(urlOf(1)).toBe('https://cf.test/api/user.status?handle=tourist&from=1');
  });

  it('sends a timeout signal with each request', async () => {
    const { client, fetchImpl } = setup([]);
    await client.userStatus('x');
    expect(fetchImpl.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal);
  });
});
