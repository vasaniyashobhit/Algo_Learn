import { describe, expect, it } from 'vitest';
import { codeforcesUrl, ratingText, similarPath } from './problemLinks.js';
import { shortTopic } from './topicNames.js';

describe('problem links', () => {
  it('builds the Codeforces problemset URL and our similar page path', () => {
    expect(codeforcesUrl({ contestId: 1950, index: 'F2' })).toBe('https://codeforces.com/problemset/problem/1950/F2');
    expect(similarPath('1950/F2')).toBe('/problems/1950/F2/similar');
  });

  it('never leaves the rating blank', () => {
    expect(ratingText(1700)).toBe('1700');
    expect(ratingText(null)).toBe('Unrated');
  });
});

describe('shortTopic', () => {
  it('shortens long tags for the radar axis only', () => {
    expect(shortTopic('constructive algorithms')).toBe('constructive');
    expect(shortTopic('dp')).toBe('dp');
    expect(shortTopic('a very long future tag name')).toBe('a very long fut…');
    expect(shortTopic()).toBe('');
  });
});
