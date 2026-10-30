/** "45 seconds", "1 minute", "15 minutes", "1 hour" from a number of seconds. */
export const formatWait = (seconds) => {
  const value = Math.max(1, Math.round(Number(seconds) || 0));
  if (value < 60) return `${value} second${value === 1 ? '' : 's'}`;
  const minutes = Math.ceil(value / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'}`;
  const hours = Math.ceil(minutes / 60);
  return `${hours} hour${hours === 1 ? '' : 's'}`;
};
