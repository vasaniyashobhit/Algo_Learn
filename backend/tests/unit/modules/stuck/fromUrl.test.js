import { describe, expect, it } from 'vitest';
import { createFromUrl } from '../../../../src/modules/stuck/input/fromUrl.js';
import { STATEMENT, fakeFetch, fakeLookup, html, page, redirect } from '../../../helpers/stuck.js';

const lookup = fakeLookup({ 'example.com': ['93.184.216.34'], 'cdn.example.com': ['93.184.216.35'], 'evil.example': ['10.0.0.1'] });
const statementPage = page(html(`<nav>menu</nav><main><h1>A. Theatre Square</h1><p>${STATEMENT}</p></main>`));

describe('fromUrl (success paths)', () => {
  it('returns the problem id of a Codeforces link without fetching', async () => {
    const fetchImpl = fakeFetch();
    const fromUrl = createFromUrl({ fetchImpl, lookup });
    expect(await fromUrl('https://codeforces.com/problemset/problem/1/a')).toEqual({ problemId: '1/A' });
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(lookup).not.toHaveBeenCalledWith('codeforces.com', expect.anything());
  });

  it('fetches another page and extracts its main text', async () => {
    const fetchImpl = fakeFetch({ 'https://example.com/p': statementPage });
    const { text } = await createFromUrl({ fetchImpl, lookup })('https://example.com/p');
    expect(text.startsWith('A. Theatre Square\nA. Theatre Square')).toBe(true);
    expect(text).not.toContain('menu');
    expect(fetchImpl).toHaveBeenCalledWith('https://example.com/p', expect.objectContaining({
      redirect: 'manual', signal: expect.any(AbortSignal),
    }));
  });

  it('reads text/plain pages and caps the text', async () => {
    const fetchImpl = fakeFetch({ 'https://example.com/t.txt': page('x'.repeat(30_000), { type: 'text/plain' }) });
    expect((await createFromUrl({ fetchImpl, lookup })('https://example.com/t.txt')).text).toHaveLength(20_000);
  });

  it('follows a redirect to another public host, re-checking it', async () => {
    const fetchImpl = fakeFetch({
      'https://example.com/old': redirect('https://cdn.example.com/new'),
      'https://cdn.example.com/new': statementPage,
    });
    expect(await createFromUrl({ fetchImpl, lookup })('https://example.com/old')).toHaveProperty('text');
    expect(lookup).toHaveBeenCalledWith('cdn.example.com', expect.anything());
  });

  it('resolves relative redirects against the current URL', async () => {
    const fetchImpl = fakeFetch({ 'https://example.com/a/b': redirect('../c', 301), 'https://example.com/c': statementPage });
    expect(await createFromUrl({ fetchImpl, lookup })('https://example.com/a/b')).toHaveProperty('text');
  });
});

describe('fromUrl (SSRF through redirects)', () => {
  it('refuses a redirect to a private address', async () => {
    const fetchImpl = fakeFetch({ 'https://example.com/r': redirect('http://evil.example/admin') });
    await expect(createFromUrl({ fetchImpl, lookup })('https://example.com/r')).rejects.toMatchObject({
      code: 'URL_NOT_ALLOWED', details: { reason: 'private' },
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('refuses a redirect to the cloud metadata IP or a non-http scheme', async () => {
    const fetchImpl = fakeFetch({
      'https://example.com/m': redirect('http://169.254.169.254/latest/meta-data/'),
      'https://example.com/f': redirect('file:///etc/passwd'),
    });
    const fromUrl = createFromUrl({ fetchImpl, lookup: fakeLookup({ 'example.com': ['93.184.216.34'], '169.254.169.254': ['169.254.169.254'] }) });
    await expect(fromUrl('https://example.com/m')).rejects.toMatchObject({ code: 'URL_NOT_ALLOWED' });
    await expect(fromUrl('https://example.com/f')).rejects.toMatchObject({ code: 'URL_NOT_ALLOWED', details: { reason: 'scheme' } });
  });

  it('refuses a private URL before any fetch', async () => {
    const fetchImpl = fakeFetch();
    await expect(createFromUrl({ fetchImpl, lookup })('http://evil.example/')).rejects.toMatchObject({ code: 'URL_NOT_ALLOWED' });
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
