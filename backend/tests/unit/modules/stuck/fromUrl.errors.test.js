import { describe, expect, it } from 'vitest';
import { createFromUrl } from '../../../../src/modules/stuck/input/fromUrl.js';
import { fakeFetch, fakeLookup, html, page, redirect } from '../../../helpers/stuck.js';

const lookup = fakeLookup({ 'example.com': ['93.184.216.34'] });
const URL_ = 'https://example.com/p';
const fromUrlWith = (route, options = {}) => createFromUrl({ fetchImpl: fakeFetch({ [URL_]: route }), lookup, ...options });
const fetchFailed = (reason, statusCode = 502) => ({ statusCode, code: 'URL_FETCH_FAILED', details: expect.objectContaining({ reason }) });

describe('fromUrl (failures → URL_FETCH_FAILED)', () => {
  it('maps a non-2xx answer', async () => {
    await expect(fromUrlWith(page('no', { status: 403 }))(URL_)).rejects.toMatchObject({
      ...fetchFailed('status'), details: { reason: 'status', status: 403 },
    });
  });

  it('maps a page that is not HTML or text', async () => {
    await expect(fromUrlWith(page('%PDF', { type: 'application/pdf' }))(URL_)).rejects.toMatchObject(fetchFailed('unsupported_type'));
    await expect(fromUrlWith(new Response('x', { status: 200, headers: { 'content-type': '' } }))(URL_))
      .rejects.toMatchObject(fetchFailed('unsupported_type'));
  });

  it('maps a page without problem text', async () => {
    await expect(fromUrlWith(page(html('<p>Hi</p>')))(URL_)).rejects.toMatchObject(fetchFailed('no_text'));
  });

  it('maps a body over the 2 MB cap', async () => {
    // A fresh Response (not a clone): cancelling one branch of a tee'd body never settles.
    const big = () => page(html(`<p>${'x'.repeat(100)}</p>`));
    const fromUrl = fromUrlWith(big, { limits: { timeoutMs: 8000, maxBytes: 50, maxRedirects: 3 } });
    await expect(fromUrl(URL_)).rejects.toMatchObject(fetchFailed('too_large'));
  });

  it('maps a body that breaks while streaming', async () => {
    const broken = new ReadableStream({ pull(controller) { controller.error(new Error('socket hang up')); } });
    const response = new Response(broken, { headers: { 'content-type': 'text/html' } });
    await expect(fromUrlWith(response)(URL_)).rejects.toMatchObject(fetchFailed('network'));
  });

  it('maps a network error and a timeout (8 s, whole fetch)', async () => {
    await expect(fromUrlWith(() => { throw new TypeError('fetch failed'); })(URL_)).rejects.toMatchObject(fetchFailed('network'));
    const hang = (_url, { signal }) => new Promise((_r, reject) => signal.addEventListener('abort', () => reject(signal.reason)));
    const fromUrl = fromUrlWith(hang, { limits: { timeoutMs: 20, maxBytes: 100, maxRedirects: 3 } });
    await expect(fromUrl(URL_)).rejects.toMatchObject(fetchFailed('timeout', 503));
  });

  it('maps too many redirects and a redirect without a location', async () => {
    const loop = createFromUrl({ fetchImpl: fakeFetch({ [URL_]: redirect(URL_) }), lookup });
    await expect(loop(URL_)).rejects.toMatchObject(fetchFailed('too_many_redirects'));
    await expect(fromUrlWith(new Response(null, { status: 302 }))(URL_)).rejects.toMatchObject(fetchFailed('status'));
  });

  it('reports an invalid URL as VALIDATION_FAILED', async () => {
    await expect(fromUrlWith(page('x'))('example.com/p')).rejects.toMatchObject({ code: 'VALIDATION_FAILED' });
  });
});
