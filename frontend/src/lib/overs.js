// The last 30 days as five overs of six balls, like a cricket scorecard.
export const BALLS_PER_OVER = 6;

/**
 * Each day becomes a ball: "dot" (no submissions), "wicket" (submitted, nothing accepted)
 * or "runs" (accepted submissions that day, the number shown).
 */
export const toBall = ({ date, submissions = 0, accepted = 0 }) => {
  if (accepted > 0) return { date, kind: 'runs', value: accepted, submissions };
  if (submissions > 0) return { date, kind: 'wicket', value: 0, submissions };
  return { date, kind: 'dot', value: 0, submissions };
};

/** [[ball × 6] × 5], oldest first. */
export const toOvers = (activity = []) => {
  const balls = activity.map(toBall);
  return Array.from({ length: Math.ceil(balls.length / BALLS_PER_OVER) }, (_, over) =>
    balls.slice(over * BALLS_PER_OVER, (over + 1) * BALLS_PER_OVER),
  );
};

/** Totals for the caption and the stat tiles. */
export const activityTotals = (activity = []) => ({
  accepted: activity.reduce((sum, day) => sum + (day.accepted ?? 0), 0),
  submissions: activity.reduce((sum, day) => sum + (day.submissions ?? 0), 0),
  activeDays: activity.filter((day) => (day.submissions ?? 0) > 0).length,
});

/** The highest accepted count of any day (0 when nothing was accepted). */
export const bestDayValue = (activity = []) => Math.max(0, ...activity.map((day) => day.accepted ?? 0));

/** "Oct 30" from "2026-10-30" (UTC, like the API's days). */
export const formatDay = (date) =>
  new Date(`${date}T00:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });

/** Plain words for one ball, used by the table and screen readers. */
export const ballText = ({ kind, value, submissions }) => {
  if (kind === 'runs') return `${value} accepted of ${submissions}`;
  if (kind === 'wicket') return `${submissions} tried, none accepted`;
  return 'No submissions';
};
