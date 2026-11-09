import { GAP } from '../../../config/constants.js';
import { topicKeysFor } from '../../stats/helpers/topicKeys.js';

const STATUS_ORDER = { weak: 0, unseen: 1, developing: 2, strong: 3 };

/** weak (< 0.4) | developing (0.4–0.7) | strong (> 0.7) | unseen (no stats yet). */
export const gapStatus = (strength, thresholds = GAP) => {
  if (strength === null || strength === undefined) return 'unseen';
  if (strength < thresholds.weakBelow) return 'weak';
  return strength > thresholds.strongAbove ? 'strong' : 'developing';
};

export const topicLabel = (topicKey) => topicKey.split('+').join(' + ');

const MESSAGES = {
  weak: (label, strength) => `Your ${label} strength is low (${strength.toFixed(2)}).`,
  unseen: (label) => `You have not practised ${label} yet.`,
  developing: (label, strength) => `Your ${label} is developing (${strength.toFixed(2)}).`,
  strong: (label, strength) => `You are strong at ${label} (${strength.toFixed(2)}).`,
};

const round2 = (value) => Math.round(value * 100) / 100;

// Weak before unseen, weakest first, single topics before pairs, then by key.
const byWeakness = (a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]
  || (a.strength ?? 0) - (b.strength ?? 0)
  || (a.kind === b.kind ? 0 : a.kind === 'single' ? -1 : 1)
  || a.topicKey.localeCompare(b.topicKey);

const summary = (tags, items) => {
  if (!tags.length) return 'We could not detect the topics of this problem.';
  const needs = `This problem needs ${tags.map(topicLabel).join(' + ')}.`;
  return items.length ? `${needs} ${items[0].message}` : `${needs} You look ready for every topic in it.`;
};

/**
 * Concept gap (pure): every topic key of the problem (singles and pairs) with the user's strength
 * and status. `items` = the gap (weak + unseen) sorted weakest first; `message` is human-readable.
 * `stats` are the user's topicstats rows `{ topicKey, strength, attempted }` for those keys.
 */
export const analyzeGap = ({ tags = [], stats = [] }) => {
  const keys = topicKeysFor(tags);
  const byKey = new Map(stats.map((stat) => [stat.topicKey, stat]));
  const topics = keys.map(({ topicKey, kind }) => {
    const stat = byKey.get(topicKey);
    const strength = stat ? round2(stat.strength) : null;
    const status = gapStatus(strength);
    return {
      topicKey, kind, strength, status, attempted: stat?.attempted ?? 0,
      message: MESSAGES[status](topicLabel(topicKey), strength),
    };
  }).toSorted(byWeakness);
  const items = topics.filter(({ status }) => status === 'weak' || status === 'unseen');
  const topicTags = keys.filter(({ kind }) => kind === 'single').map(({ topicKey }) => topicKey);
  return { message: summary(topicTags, items), items, topics };
};
