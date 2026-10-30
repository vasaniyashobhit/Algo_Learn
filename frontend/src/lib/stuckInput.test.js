import { describe, expect, it } from 'vitest';
import { buildStuckForm, checkStuckInput, fileSizeText, STUCK_LIMITS } from './stuckInput.js';

const file = (name, type, size = 1000) => {
  const blob = new File(['x'], name, { type });
  Object.defineProperty(blob, 'size', { value: size });
  return blob;
};

describe('checkStuckInput', () => {
  it('needs 40 characters of text after trimming', () => {
    expect(checkStuckInput({ inputType: 'text', text: `  ${'a'.repeat(39)}  ` })).toEqual({
      code: 'PROBLEM_TEXT_TOO_SHORT',
      details: { minLength: 40, length: 39 },
    });
    expect(checkStuckInput({ inputType: 'text', text: 'a'.repeat(40) })).toBeNull();
  });

  it.each([
    ['', null],
    ['codeforces.com/problemset/problem/1/A', 'scheme'],
    ['ftp://example.com/a', 'scheme'],
    ['https://user:pw@example.com/a', 'credentials'],
    ['https://example.com:8080/a', 'port'],
    ['http://localhost/a', 'private'],
    ['http://192.168.1.4/a', 'private'],
    ['http://172.20.0.1/a', 'private'],
    [`https://e.com/${'a'.repeat(STUCK_LIMITS.maxUrl)}`, 'scheme'],
  ])('refuses the link %s', (url, reason) => {
    const issue = checkStuckInput({ inputType: 'url', url });
    if (reason) expect(issue).toEqual({ code: 'URL_NOT_ALLOWED', details: { reason } });
    else expect(issue).toEqual({ clientMessage: 'Paste a link to the problem page.' });
  });

  it('accepts public http(s) links, also on the default ports', () => {
    expect(checkStuckInput({ inputType: 'url', url: ' https://codeforces.com/contest/1811/problem/G2 ' })).toBeNull();
    expect(checkStuckInput({ inputType: 'url', url: 'http://acm.timus.ru:80/problem.aspx' })).toBeNull();
    expect(checkStuckInput({ inputType: 'url', url: 'https://172.32.0.1/a' })).toBeNull();
  });

  it('checks the file: present, at most 5 MB, the right type for the tab', () => {
    expect(checkStuckInput({ inputType: 'pdf', file: null })).toEqual({ clientMessage: 'Choose a PDF first.' });
    expect(checkStuckInput({ inputType: 'image', file: null })).toEqual({ clientMessage: 'Choose or paste a screenshot first.' });
    expect(checkStuckInput({ inputType: 'pdf', file: file('a.pdf', 'application/pdf', 5 * 1024 * 1024 + 1) })).toEqual({
      code: 'FILE_TOO_LARGE',
      details: null,
    });
    expect(checkStuckInput({ inputType: 'image', file: file('a.pdf', 'application/pdf') })).toEqual({
      code: 'FILE_TYPE_UNSUPPORTED',
      details: { inputType: 'image' },
    });
    expect(checkStuckInput({ inputType: 'image', file: file('a.webp', 'image/webp') })).toBeNull();
    expect(checkStuckInput({ inputType: 'pdf', file: file('a.pdf', 'application/pdf', 5 * 1024 * 1024) })).toBeNull();
  });
});

describe('buildStuckForm', () => {
  it('sends inputType plus exactly one field', () => {
    const text = buildStuckForm({ inputType: 'text', text: '  statement  ', url: 'ignored' });
    expect([...text.entries()]).toEqual([['inputType', 'text'], ['text', 'statement']]);
    const url = buildStuckForm({ inputType: 'url', url: ' https://a.b/c ' });
    expect([...url.entries()]).toEqual([['inputType', 'url'], ['url', 'https://a.b/c']]);
    const upload = buildStuckForm({ inputType: 'pdf', file: file('a.pdf', 'application/pdf') });
    expect(upload.get('inputType')).toBe('pdf');
    expect(upload.get('file').name).toBe('a.pdf');
  });
});

describe('fileSizeText', () => {
  it('reads like a file size', () => {
    expect(fileSizeText(300)).toBe('1 KB');
    expect(fileSizeText(820 * 1024)).toBe('820 KB');
    expect(fileSizeText(1.44 * 1024 * 1024)).toBe('1.4 MB');
  });
});
