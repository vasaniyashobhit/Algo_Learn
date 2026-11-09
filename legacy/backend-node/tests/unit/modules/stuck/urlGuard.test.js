import { describe, expect, it } from 'vitest';
import { createUrlGuard, parseUrl } from '../../../../src/modules/stuck/input/urlGuard.js';
import { fakeLookup } from '../../../helpers/stuck.js';

const lookup = fakeLookup({
  'example.com': ['93.184.216.34'],
  'rebind.example': ['93.184.216.34', '127.0.0.1'],
  'metadata.example': ['169.254.169.254'],
  'v6.example': ['2606:4700::6810:1'],
  'internal.example': ['fd00::5'],
  '127.0.0.1': ['127.0.0.1'],
  '::1': ['::1'],
  '10.0.0.7': ['10.0.0.7'],
  'empty.example': [],
});
const guard = createUrlGuard({ lookup });
const check = (href) => guard(new URL(href));
const notAllowed = (reason) => ({ statusCode: 400, code: 'URL_NOT_ALLOWED', details: { reason } });

describe('URL guard (SSRF)', () => {
  it('allows public http(s) hosts on default ports', async () => {
    await expect(check('https://example.com/p')).resolves.toBeUndefined();
    await expect(check('http://example.com:80/p')).resolves.toBeUndefined();
    await expect(check('https://v6.example/')).resolves.toBeUndefined();
    expect(lookup).toHaveBeenCalledWith('example.com', { all: true, verbatim: true });
  });

  it.each(['file:///etc/passwd', 'ftp://example.com/x', 'gopher://example.com/', 'data:text/plain,hi', 'javascript:alert(1)'])(
    'refuses the non-http scheme of %s',
    async (href) => {
      await expect(check(href)).rejects.toMatchObject(notAllowed('scheme'));
    },
  );

  it.each([
    'http://localhost/', 'http://LOCALHOST:80/', 'http://api.localhost/', 'http://127.0.0.1/', 'http://[::1]/',
    'http://10.0.0.7/', 'https://metadata.example/latest', 'https://internal.example/', 'https://rebind.example/',
  ])('refuses the private target %s (checked after DNS)', async (href) => {
    await expect(check(href)).rejects.toMatchObject(notAllowed('private'));
  });

  it('refuses credentials and non-standard ports', async () => {
    await expect(check('https://user:pw@example.com/')).rejects.toMatchObject(notAllowed('credentials'));
    await expect(check('http://example.com:6379/')).rejects.toMatchObject(notAllowed('port'));
  });

  it('refuses a host that resolves to nothing, and maps DNS failures to URL_FETCH_FAILED', async () => {
    await expect(check('https://empty.example/')).rejects.toMatchObject(notAllowed('private'));
    await expect(check('https://nowhere.example/')).rejects.toMatchObject({
      statusCode: 502, code: 'URL_FETCH_FAILED', details: { reason: 'dns' },
    });
  });
});

describe('parseUrl', () => {
  it('parses a trimmed URL', () => {
    expect(parseUrl('  https://example.com/a ').href).toBe('https://example.com/a');
  });

  it('reports an invalid URL as VALIDATION_FAILED on the url field', () => {
    expect(() => parseUrl('not a url')).toThrow(expect.objectContaining({
      code: 'VALIDATION_FAILED', details: [expect.objectContaining({ field: 'body.url' })],
    }));
    expect(() => parseUrl(undefined)).toThrow(expect.objectContaining({ code: 'VALIDATION_FAILED' }));
  });
});
