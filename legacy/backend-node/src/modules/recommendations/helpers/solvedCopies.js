import { COPY_CONTEST_GAP } from '../../../config/constants.js';

/** Titles compared trimmed, case-insensitive, with inner whitespace collapsed. */
export const normalizeTitle = (title) => String(title ?? '').trim().replace(/\s+/g, ' ').toLowerCase();

/**
 * Same problem, or a Div1/Div2 copy of it: the same title (case-insensitive) in a contest at
 * most `gap` ids away (e.g. 1900/C and 1901/A).
 */
export const isSameOrCopy = (a, b, gap = COPY_CONTEST_GAP) =>
  a.id === b.id || (
    normalizeTitle(a.title) !== ''
    && normalizeTitle(a.title) === normalizeTitle(b.title)
    && Math.abs(a.contestId - b.contestId) <= gap
  );

/**
 * Matcher over the user's solved problems (`{ id, title, contestId }`; title may be unknown).
 * `isSolved(problem)` is true for a solved id or a copy of a solved problem.
 */
export const createSolvedMatcher = (solvedProblems, gap = COPY_CONTEST_GAP) => {
  const ids = new Set(solvedProblems.map(({ id }) => id));
  const byTitle = Map.groupBy(solvedProblems.filter(({ title }) => normalizeTitle(title)), ({ title }) => normalizeTitle(title));
  return (problem) => ids.has(problem.id)
    || (byTitle.get(normalizeTitle(problem.title)) ?? []).some((solved) => isSameOrCopy(problem, solved, gap));
};
