import { STATS_VIEW } from '../../../config/constants.js';
import { DAY_MS } from './decay.js';

/** UTC calendar day of a date, as `YYYY-MM-DD`. */
export const utcDay = (date) => new Date(date).toISOString().slice(0, 10);

/**
 * Submissions and accepted submissions per UTC day for the last `days` days, oldest first,
 * ending today. Days without activity are listed with zeros.
 */
export const dailyActivity = (submissions, now, days = STATS_VIEW.activityDays) => {
  const byDay = new Map(Array.from({ length: days }, (_, i) =>
    [utcDay(now - (days - 1 - i) * DAY_MS), { submissions: 0, accepted: 0 }]));
  for (const { submittedAt, verdict } of submissions) {
    const day = byDay.get(utcDay(submittedAt));
    if (!day) continue;
    day.submissions += 1;
    if (verdict === 'OK') day.accepted += 1;
  }
  return [...byDay].map(([date, counts]) => ({ date, ...counts }));
};
