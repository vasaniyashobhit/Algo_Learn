/** "45 seconds", "1 minute", "15 minutes", "1 hour" from a number of seconds. */
export const formatWait = (seconds) => {
  const value = Math.max(1, Math.round(Number(seconds) || 0));
  if (value < 60) return `${value} second${value === 1 ? '' : 's'}`;
  const minutes = Math.ceil(value / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'}`;
  const hours = Math.ceil(minutes / 60);
  return `${hours} hour${hours === 1 ? '' : 's'}`;
};

const CLOCK = { hour: '2-digit', minute: '2-digit', hour12: false };

/** The local clock time `seconds` from now, e.g. "02:14", for "your next request opens at …". */
export const retryClock = (seconds, now = Date.now()) =>
  new Date(now + Math.max(0, Number(seconds) || 0) * 1000).toLocaleTimeString('en-GB', CLOCK);

/** "30 Oct · 01:12" in local time, for history rows. */
export const formatWhen = (iso) => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const day = date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  return `${day} · ${date.toLocaleTimeString('en-GB', CLOCK)}`;
};
