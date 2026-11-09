import { describe, expect, it } from 'vitest';
import { dailyActivity, utcDay } from '../../../../src/modules/stats/helpers/activity.js';

const NOW = new Date('2026-10-29T10:00:00Z');

describe('utcDay', () => {
  it('formats the UTC calendar day', () => {
    expect(utcDay(new Date('2026-10-29T23:59:59Z'))).toBe('2026-10-29');
    expect(utcDay('2026-01-02T00:00:00Z')).toBe('2026-01-02');
  });
});

describe('dailyActivity', () => {
  it('lists the last 30 days oldest first, ending today, zero-filled', () => {
    const days = dailyActivity([], NOW);
    expect(days).toHaveLength(30);
    expect(days[0]).toEqual({ date: '2026-09-30', submissions: 0, accepted: 0 });
    expect(days.at(-1)).toEqual({ date: '2026-10-29', submissions: 0, accepted: 0 });
  });

  it('counts submissions and accepted ones per day, ignoring older ones', () => {
    const days = dailyActivity([
      { submittedAt: new Date('2026-10-29T01:00:00Z'), verdict: 'OK' },
      { submittedAt: new Date('2026-10-29T02:00:00Z'), verdict: 'WRONG_ANSWER' },
      { submittedAt: new Date('2026-10-01T05:00:00Z'), verdict: 'OK' },
      { submittedAt: new Date('2026-09-29T23:00:00Z'), verdict: 'OK' },
    ], NOW);
    expect(days.at(-1)).toEqual({ date: '2026-10-29', submissions: 2, accepted: 1 });
    expect(days.find(({ date }) => date === '2026-10-01')).toEqual({ date: '2026-10-01', submissions: 1, accepted: 1 });
    expect(days.reduce((sum, day) => sum + day.submissions, 0)).toBe(3);
  });

  it('accepts another window', () => {
    expect(dailyActivity([], NOW, 7).map(({ date }) => date)).toEqual([
      '2026-10-23', '2026-10-24', '2026-10-25', '2026-10-26', '2026-10-27', '2026-10-28', '2026-10-29',
    ]);
  });
});
