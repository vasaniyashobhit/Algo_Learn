// Strength is 0–1 (0.5 = no data). Bands are for words next to the number, never colour alone.
export const WEAK_BELOW = 0.4;
export const STRONG_FROM = 0.65;

/** 0.4167 → "0.42" (tabular, two decimals like a batting average). */
export const formatStrength = (value) => (Number.isFinite(value) ? value.toFixed(2) : '–');

/** "weak" | "steady" | "strong" */
export const strengthLevel = (value) => {
  if (value < WEAK_BELOW) return 'weak';
  return value >= STRONG_FROM ? 'strong' : 'steady';
};

export const LEVEL_LABELS = { weak: 'Weak', steady: 'Steady', strong: 'Strong' };

/** "bitmasks+dp" → "bitmasks + dp" so pair keys read as two topics. */
export const topicLabel = (key = '') => key.split('+').join(' + ');

/** "4 of 11 solved" */
export const solvedText = ({ solved = 0, attempted = 0 }) => `${solved} of ${attempted} solved`;
