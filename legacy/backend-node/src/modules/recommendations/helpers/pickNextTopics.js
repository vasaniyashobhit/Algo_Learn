import { TOPIC_TAGS, isTopicTag } from '../../../config/tags.js';
import { RECOMMENDATIONS, TOPIC_BASES } from '../../../config/constants.js';
import { topicReason } from './topicReason.js';

const round4 = (value) => Math.round(value * 10_000) / 10_000;

/** Attempted enough, neither weak beyond help nor mastered: strength in [min, max]. */
export const inLearningZone = ({ attempted = 0, strength = 0 }, settings = RECOMMENDATIONS) =>
  attempted >= settings.minAttempted && strength >= settings.minStrength && strength <= settings.maxStrength;

const isMastered = ({ attempted = 0, strength = 0 }, settings) =>
  attempted >= settings.minAttempted && strength > settings.maxStrength;

/** (1 − strength) · log(1 + share): weaker topics that are common at the user's level first. */
export const topicPriority = (strength, share) => (1 - strength) * Math.log1p(share);

const byFrequency = (frequency) => (a, b) => (frequency[b] ?? 0) - (frequency[a] ?? 0) || a.localeCompare(b);

const toPick = (topic, stat, basis, freq, ratingKnown) => {
  const share = freq.frequency[topic] ?? 0;
  return {
    topic,
    basis,
    strength: stat?.strength ?? null,
    attempted: stat?.attempted ?? 0,
    solved: stat?.solved ?? 0,
    comfortRating: stat?.comfortRating ?? null,
    frequency: round4(share),
    priority: basis === TOPIC_BASES.learningZone ? round4(topicPriority(stat.strength, share)) : null,
    reason: topicReason({ topic, stat, share, rating: freq.rating, ratingKnown }),
  };
};

/**
 * Up to `n` next topics. Learning-zone topics first, by priority (ties: weaker, then name).
 * Cold start (no stats) or too few in the zone: the most frequent topic tags at the user's
 * rating fill the rest (mastered topics skipped), so the answer is never empty.
 * `freq` is topicFrequencyAtRating(); `ratingKnown` only changes the reason wording.
 */
export const pickNextTopics = (stats, freq, n = RECOMMENDATIONS.topics, { ratingKnown = true, settings = RECOMMENDATIONS } = {}) => {
  const singles = (stats ?? []).filter(({ kind = 'single', topicKey }) => kind === 'single' && isTopicTag(topicKey));
  const statOf = new Map(singles.map((stat) => [stat.topicKey, stat]));
  const share = (topic) => freq.frequency[topic] ?? 0;
  const zone = singles
    .filter((stat) => inLearningZone(stat, settings))
    .map((stat) => ({ stat, priority: topicPriority(stat.strength, share(stat.topicKey)) }))
    .toSorted((a, b) => b.priority - a.priority || a.stat.strength - b.stat.strength
      || a.stat.topicKey.localeCompare(b.stat.topicKey))
    .slice(0, n)
    .map(({ stat }) => toPick(stat.topicKey, stat, TOPIC_BASES.learningZone, freq, ratingKnown));
  const taken = new Set(zone.map(({ topic }) => topic));
  const fill = TOPIC_TAGS
    .filter((topic) => !taken.has(topic) && !isMastered(statOf.get(topic) ?? {}, settings))
    .toSorted(byFrequency(freq.frequency))
    .slice(0, Math.max(0, n - zone.length))
    .map((topic) => toPick(topic, statOf.get(topic), TOPIC_BASES.frequent, freq, ratingKnown));
  return [...zone, ...fill];
};
