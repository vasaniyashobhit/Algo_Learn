import { describe, expect, it } from 'vitest';
import { activity } from '../test/dashboardFixtures.js';
import { activityTotals, ballText, bestDayValue, formatDay, toBall, toOvers } from './overs.js';

describe('overs', () => {
  it('turns days into dots, wickets and runs', () => {
    expect(toBall({ date: 'd', submissions: 0, accepted: 0 })).toMatchObject({ kind: 'dot', value: 0 });
    expect(toBall({ date: 'd', submissions: 3, accepted: 0 })).toMatchObject({ kind: 'wicket', submissions: 3 });
    expect(toBall({ date: 'd', submissions: 4, accepted: 2 })).toMatchObject({ kind: 'runs', value: 2 });
    expect(toBall({ date: 'd' })).toMatchObject({ kind: 'dot' });
  });

  it('splits 30 days into five overs of six, oldest first', () => {
    const overs = toOvers(activity());
    expect(overs).toHaveLength(5);
    expect(overs.every((over) => over.length === 6)).toBe(true);
    expect(overs[0][0].date).toBe('2026-10-01');
    expect(overs.at(-1).at(-1).date).toBe('2026-10-30');
    expect(toOvers()).toEqual([]);
  });

  it('totals accepted, submissions and active days', () => {
    const days = activity({ 0: { submissions: 3, accepted: 1 }, 4: { submissions: 2, accepted: 0 } });
    expect(activityTotals(days)).toEqual({ accepted: 1, submissions: 5, activeDays: 2 });
    expect(activityTotals()).toEqual({ accepted: 0, submissions: 0, activeDays: 0 });
    expect(bestDayValue(activity({ 3: { submissions: 9, accepted: 5 } }))).toBe(5);
    expect(bestDayValue()).toBe(0);
  });

  it('names days and balls in plain words', () => {
    expect(formatDay('2026-10-30')).toBe('Oct 30');
    expect(ballText({ kind: 'runs', value: 2, submissions: 4 })).toBe('2 accepted of 4');
    expect(ballText({ kind: 'wicket', value: 0, submissions: 3 })).toBe('3 tried, none accepted');
    expect(ballText({ kind: 'dot' })).toBe('No submissions');
  });
});
