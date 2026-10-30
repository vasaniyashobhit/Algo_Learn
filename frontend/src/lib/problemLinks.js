/** The problem on Codeforces (opens in a new tab; we never copy their branding). */
export const codeforcesUrl = ({ contestId, index }) => `https://codeforces.com/problemset/problem/${contestId}/${index}`;

/** Our similar-problems page for "1950/F2". */
export const similarPath = (problemId) => `/problems/${problemId}/similar`;

/** "Unrated" instead of a blank rating cell. */
export const ratingText = (rating) => (Number.isFinite(rating) ? String(rating) : 'Unrated');
