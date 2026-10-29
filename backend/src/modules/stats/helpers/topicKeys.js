import { isTopicTag, pairKey } from '../../../config/tags.js';

/**
 * Topic keys a problem counts toward: each topic tag (`*special` and unknown tags skipped,
 * duplicates removed) as `single`, and every sorted pair of them as `pair`.
 */
export const topicKeysFor = (tags = []) => {
  const topics = [...new Set(tags.filter(isTopicTag))].toSorted();
  const singles = topics.map((topicKey) => ({ topicKey, kind: 'single' }));
  const pairs = topics.flatMap((a, i) =>
    topics.slice(i + 1).map((b) => ({ topicKey: pairKey(a, b), kind: 'pair' })));
  return [...singles, ...pairs];
};
