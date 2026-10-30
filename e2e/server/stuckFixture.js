/** The statement the "stuck with text" flow pastes: it matches seeded problem 1500/A exactly. */
export const STUCK_TITLE = 'Balanced Bracket Splits';
export const STUCK_STATEMENT = [
  'You are given a bracket sequence s of length n. Split it into the minimum number of',
  'contiguous parts so that every part is a balanced bracket sequence, or report -1.',
].join(' ');

/** Stuck text containing this marker makes the fake AI fail, so the fallback path can be tested. */
export const AI_OUTAGE_MARKER = 'AI-OUTAGE';
