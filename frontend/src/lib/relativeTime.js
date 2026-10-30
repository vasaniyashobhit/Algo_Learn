const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const plural = (value, unit) => `${value} ${unit}${value === 1 ? '' : 's'} ago`;

/** "just now", "5 minutes ago", "2 hours ago", "yesterday", "4 days ago", or "never" without a date. */
export const formatRelativeTime = (iso, now = Date.now()) => {
  const time = iso ? new Date(iso).getTime() : Number.NaN;
  if (Number.isNaN(time)) return 'never';
  const elapsed = Math.max(0, now - time);
  if (elapsed < MINUTE) return 'just now';
  if (elapsed < HOUR) return plural(Math.floor(elapsed / MINUTE), 'minute');
  if (elapsed < DAY) return plural(Math.floor(elapsed / HOUR), 'hour');
  const days = Math.floor(elapsed / DAY);
  return days === 1 ? 'yesterday' : plural(days, 'day');
};
