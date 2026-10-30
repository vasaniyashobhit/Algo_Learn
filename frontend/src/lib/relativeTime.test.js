import { describe, expect, it } from 'vitest';
import { formatRelativeTime } from './relativeTime.js';

const NOW = Date.parse('2026-10-30T12:00:00.000Z');
const ago = (ms) => new Date(NOW - ms).toISOString();

describe('formatRelativeTime', () => {
  it.each([
    [ago(5_000), 'just now'],
    [ago(60_000), '1 minute ago'],
    [ago(5 * 60_000), '5 minutes ago'],
    [ago(60 * 60_000), '1 hour ago'],
    [ago(2 * 3_600_000 + 59 * 60_000), '2 hours ago'],
    [ago(26 * 3_600_000), 'yesterday'],
    [ago(4 * 86_400_000), '4 days ago'],
  ])('%s → %s', (iso, text) => expect(formatRelativeTime(iso, NOW)).toBe(text));

  it('says never without a valid date', () => {
    expect(formatRelativeTime(null, NOW)).toBe('never');
    expect(formatRelativeTime('nope', NOW)).toBe('never');
  });

  it('treats a time slightly in the future (clock skew) as just now', () => {
    expect(formatRelativeTime(new Date(NOW + 10_000).toISOString(), NOW)).toBe('just now');
  });
});
