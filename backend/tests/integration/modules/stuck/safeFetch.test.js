import { createServer } from 'node:http';
import { once } from 'node:events';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createSafeFetch, isPrivateAddressError } from '../../../../src/modules/stuck/input/safeFetch.js';
import { fakeLookup } from '../../../helpers/stuck.js';

// A real server on 127.0.0.1. "rebind.test" resolves to it at connect time, as a DNS-rebinding
// host would after passing the first (public) lookup.
const seen = [];
let server;
let port;
beforeAll(async () => {
  server = createServer((req, res) => {
    seen.push(req.headers.host);
    res.end('hello from the inside');
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  ({ port } = server.address());
});
afterAll(() => server.close());

const connectLookup = fakeLookup({ 'rebind.test': ['127.0.0.1'], 'mixed.test': ['93.184.216.34', '127.0.0.1'] });

describe('safe fetch (IP checked at connect time)', () => {
  it('refuses to connect when the host resolves to a private address', async () => {
    const safeFetch = createSafeFetch({ lookup: connectLookup });
    const before = seen.length;
    const err = await safeFetch(`http://rebind.test:${port}/`).catch((e) => e);
    expect(isPrivateAddressError(err)).toBe(true);
    expect(seen.length).toBe(before);
    await safeFetch.close();
  });

  it('refuses a host with any private address among its records', async () => {
    const safeFetch = createSafeFetch({ lookup: connectLookup });
    expect(isPrivateAddressError(await safeFetch(`http://mixed.test:${port}/`).catch((e) => e))).toBe(true);
    await safeFetch.close();
  });

  it('connects to exactly the address the guarded lookup returned', async () => {
    const safeFetch = createSafeFetch({ lookup: connectLookup, isBlocked: () => false });
    const res = await safeFetch(`http://rebind.test:${port}/page`);
    expect(await res.text()).toBe('hello from the inside');
    expect(seen.at(-1)).toBe(`rebind.test:${port}`);
    await safeFetch.close();
  });

  it('passes DNS failures through as network errors (not a private-address refusal)', async () => {
    const safeFetch = createSafeFetch({ lookup: connectLookup });
    const err = await safeFetch(`http://unknown.test:${port}/`).catch((e) => e);
    expect(err).toBeInstanceOf(TypeError);
    expect(isPrivateAddressError(err)).toBe(false);
    await safeFetch.close();
  });
});
