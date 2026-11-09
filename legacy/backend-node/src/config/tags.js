import { ValidationError } from '../errors/httpErrors.js';
import { codes } from '../errors/codes.js';

export const SPECIAL_TAG = '*special';

export const ALL_TAGS = Object.freeze([
  'math', 'greedy', 'implementation', 'dp', 'data structures',
  'constructive algorithms', 'brute force', 'binary search', 'sortings', 'graphs',
  'dfs and similar', 'trees', 'number theory', 'strings', 'combinatorics',
  'bitmasks', 'two pointers', SPECIAL_TAG, 'geometry', 'dsu',
  'divide and conquer', 'shortest paths', 'games', 'probabilities', 'interactive',
  'hashing', 'flows', 'matrices', 'fft', 'graph matchings',
  'string suffix structures', 'ternary search', 'meet-in-the-middle', '2-sat',
  'expression parsing', 'chinese remainder theorem', 'schedules',
]);

export const TOPIC_TAGS = Object.freeze(ALL_TAGS.filter((tag) => tag !== SPECIAL_TAG));

const topicSet = new Set(TOPIC_TAGS);

export const isTopicTag = (tag) => topicSet.has(tag);

/** Sorted, `+`-joined key for two distinct topic tags, e.g. `bitmasks+dp`. */
export const pairKey = (a, b) => {
  if (!isTopicTag(a) || !isTopicTag(b) || a === b) {
    throw new ValidationError(codes.VALIDATION_FAILED, 'A pair needs two distinct topic tags', [
      { field: 'tags', message: `Invalid tag pair: "${a}", "${b}"` },
    ]);
  }
  return [a, b].toSorted().join('+');
};

export const TOPIC_PAIR_KEYS = Object.freeze(
  TOPIC_TAGS.flatMap((a, i) => TOPIC_TAGS.slice(i + 1).map((b) => pairKey(a, b))).toSorted(),
);
