import { describe, expect, it } from 'vitest';
import { parseCodeforcesUrl } from '../../../../src/modules/stuck/helpers/codeforcesUrl.js';

const parse = (href) => parseCodeforcesUrl(new URL(href));

describe('parseCodeforcesUrl', () => {
  it.each([
    ['https://codeforces.com/contest/1/problem/A', '1/A'],
    ['https://codeforces.com/problemset/problem/1950/f2', '1950/F2'],
    ['http://www.codeforces.com/contest/1723/problem/GP1/', '1723/GP1'],
    ['https://m1.codeforces.com/problemset/problem/4/A?locale=en', '4/A'],
    ['https://codeforces.ru/contest/921/problem/01', '921/01'],
    ['https://codeforces.com/gym/104114/problem/B', '104114/B'],
  ])('%s → %s', (href, id) => {
    expect(parse(href)).toBe(id);
  });

  it.each([
    'https://codeforces.com/blog/entry/1',
    'https://codeforces.com/contest/1',
    'https://codeforces.com/contest/1/problem/ABCD',
    'https://evil-codeforces.com/contest/1/problem/A',
    'https://codeforces.com.evil.io/contest/1/problem/A',
    'ftp://codeforces.com/contest/1/problem/A',
    'https://atcoder.jp/contests/abc001/tasks/abc001_1',
  ])('returns null for %s', (href) => {
    expect(parse(href)).toBeNull();
  });

  it('normalizes leading zeros in the contest id', () => {
    expect(parse('https://codeforces.com/contest/0001/problem/A')).toBe('1/A');
  });
});
