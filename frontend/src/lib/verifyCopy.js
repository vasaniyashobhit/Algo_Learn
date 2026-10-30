import { formatWait } from './formatters.js';

// "I solved it" answers that are not errors (200 with verified: false), plus the cooldown text.
export const VERIFY_COPY = {
  NOT_SOLVED_YET: "We don't see an accepted submission yet. Submit on Codeforces, then check again.",
  STILL_JUDGING: 'Codeforces is still judging your submission — try again in a minute.',
};

export const verifyWaitText = (seconds) => `Codeforces was checked moments ago. Try again in ${formatWait(seconds)}.`;
