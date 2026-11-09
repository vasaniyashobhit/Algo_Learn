/** Logistic function 1 / (1 + e^−x): in (0, 1), 0.5 at x = 0. */
export const sigmoid = (x) => 1 / (1 + Math.exp(-x));
