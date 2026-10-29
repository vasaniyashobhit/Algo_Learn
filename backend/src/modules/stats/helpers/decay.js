import { DAY_SECONDS, STATS } from '../../../config/constants.js';

export const DAY_MS = DAY_SECONDS * 1000;

/** Age in days between two dates (0 when `lastAt` is in the future, e.g. clock skew). */
export const ageDays = (lastAt, now) => Math.max(0, (now - lastAt) / DAY_MS);

/** Time decay 0.5^(ageDays / halfLife): 1 today, 0.5 after 90 days, 0.25 after 180. */
export const decay = (lastAt, now, halfLifeDays = STATS.halfLifeDays) =>
  0.5 ** (ageDays(lastAt, now) / halfLifeDays);
