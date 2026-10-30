/** The problem on Codeforces (opens in a new tab; we never copy their branding). */
export const codeforcesUrl = ({ contestId, index }) => `https://codeforces.com/problemset/problem/${contestId}/${index}`;

/** Our problem detail page for "1950/F2". */
export const problemPath = (problemId) => `/problems/${problemId}`;

/** Our similar-problems page for "1950/F2". */
export const similarPath = (problemId) => `/problems/${problemId}/similar`;

/** "Unrated" instead of a blank rating cell. */
export const ratingText = (rating) => (Number.isFinite(rating) ? String(rating) : 'Unrated');

/** A big rating figure: the number, or an en dash when unrated (pair it with an sr-only word). */
export const ratingFigure = (rating) => (Number.isFinite(rating) ? String(rating) : '–');
