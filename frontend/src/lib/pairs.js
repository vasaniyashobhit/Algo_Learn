// Pair insights: which topic combinations hold up and which collapse together.
export const PAIR_MIN_ATTEMPTED = 3;
export const PAIR_LIMIT = 3;
// 0.5 is the no-data prior: below it a pair is going worse than a coin flip, from it on better.
export const PAIR_SPLIT = 0.5;

const byStrength = (a, b) => a.strength - b.strength || b.attempted - a.attempted || a.topicKey.localeCompare(b.topicKey);

/** { weak, strong, eligible }: up to 3 each from pairs with ≥ 3 attempts, split at strength 0.5. */
export const pairInsights = (pairs = []) => {
  const eligible = pairs.filter((pair) => pair.attempted >= PAIR_MIN_ATTEMPTED).toSorted(byStrength);
  const weak = eligible.filter((pair) => pair.strength < PAIR_SPLIT).slice(0, PAIR_LIMIT);
  const strong = eligible
    .filter((pair) => pair.strength >= PAIR_SPLIT)
    .toReversed()
    .slice(0, PAIR_LIMIT);
  return { weak, strong, eligible: eligible.length };
};
