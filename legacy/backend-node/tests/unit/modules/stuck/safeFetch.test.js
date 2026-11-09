import { describe, expect, it, vi } from 'vitest';
import {
  PRIVATE_ADDRESS, PrivateAddressError, createGuardedLookup, isPrivateAddressError,
} from '../../../../src/modules/stuck/input/safeFetch.js';
import { createFromUrl } from '../../../../src/modules/stuck/input/fromUrl.js';
import { fakeLookup } from '../../../helpers/stuck.js';

const lookup = fakeLookup({ 'example.com': ['93.184.216.34', '2606:2800::1'], 'evil.test': ['10.0.0.1'] });
const callLookup = (host, options) => new Promise((resolve) => {
  createGuardedLookup({ lookup })(host, options, (...args) => resolve(args));
});

describe('guarded connect lookup', () => {
  it('answers in the single-address form by default', async () => {
    expect(await callLookup('example.com', {})).toEqual([null, '93.184.216.34', 4]);
  });

  it('answers every address when net asks for all (happy eyeballs)', async () => {
    expect(await callLookup('example.com', { all: true })).toEqual([null, [
      { address: '93.184.216.34', family: 4 }, { address: '2606:2800::1', family: 6 },
    ]]);
  });

  it('refuses private addresses and forwards DNS errors', async () => {
    const [err] = await callLookup('evil.test', {});
    expect(err).toBeInstanceOf(PrivateAddressError);
    expect(err).toMatchObject({ code: PRIVATE_ADDRESS, message: 'evil.test resolves to a private or local address (10.0.0.1)' });
    expect((await callLookup('nowhere.test', {}))[0]).toMatchObject({ code: 'ENOTFOUND' });
  });

  it('refuses a host without any address', async () => {
    const empty = fakeLookup({ 'empty.test': [] });
    const [err] = await new Promise((resolve) => createGuardedLookup({ lookup: empty })('empty.test', {}, (...a) => resolve(a)));
    expect(err.message).toBe('empty.test resolves to a private or local address');
  });

  it('finds the refusal anywhere in a cause chain', () => {
    const wrapped = new Error('outer', { cause: new TypeError('fetch failed', { cause: new PrivateAddressError('h') }) });
    expect(isPrivateAddressError(wrapped)).toBe(true);
    expect(isPrivateAddressError(new Error('x'))).toBe(false);
    expect(isPrivateAddressError(undefined)).toBe(false);
  });
});

describe('fromUrl with a connect-time refusal (DNS rebinding)', () => {
  it('maps it to URL_NOT_ALLOWED although the first lookup was public', async () => {
    const fetchImpl = vi.fn(async () => {
      throw new TypeError('fetch failed', { cause: new PrivateAddressError('example.com', '127.0.0.1') });
    });
    const err = await createFromUrl({ fetchImpl, lookup })('https://example.com/p').catch((e) => e);
    expect(err).toMatchObject({ statusCode: 400, code: 'URL_NOT_ALLOWED', details: { reason: 'private' } });
    expect(isPrivateAddressError(err.cause)).toBe(true);
  });

  it('uses the safe fetch by default', () => {
    expect(createFromUrl({ lookup })).toBeTypeOf('function');
  });
});
