// Codeforces rating bands, used only as a plain word under the rating figure.
const RANKS = [
  [3000, 'Legendary grandmaster'],
  [2600, 'International grandmaster'],
  [2400, 'Grandmaster'],
  [2300, 'International master'],
  [2100, 'Master'],
  [1900, 'Candidate master'],
  [1600, 'Expert'],
  [1400, 'Specialist'],
  [1200, 'Pupil'],
  [Number.NEGATIVE_INFINITY, 'Newbie'],
];

/** 1487 → "Specialist"; null when the rating is unknown (no rated contest yet). */
export const rankFor = (rating) => {
  if (!Number.isFinite(rating)) return null;
  return RANKS.find(([from]) => rating >= from)[1];
};
