import { describe, expect, it } from 'vitest';
import {
  ALL_TAGS, SPECIAL_TAG, TOPIC_PAIR_KEYS, TOPIC_TAGS, isTopicTag, pairKey,
} from '../../../src/config/tags.js';
import { ValidationError } from '../../../src/errors/httpErrors.js';

describe('tag lists', () => {
  it('has 37 unique Codeforces tags including *special', () => {
    expect(ALL_TAGS).toHaveLength(37);
    expect(new Set(ALL_TAGS).size).toBe(37);
    expect(ALL_TAGS).toContain(SPECIAL_TAG);
  });

  it('has 36 topic tags without *special', () => {
    expect(TOPIC_TAGS).toHaveLength(36);
    expect(TOPIC_TAGS).not.toContain('*special');
  });

  it('is frozen', () => {
    expect(Object.isFrozen(ALL_TAGS)).toBe(true);
    expect(Object.isFrozen(TOPIC_TAGS)).toBe(true);
    expect(Object.isFrozen(TOPIC_PAIR_KEYS)).toBe(true);
  });

  it('builds 630 unique sorted pair keys', () => {
    expect(TOPIC_PAIR_KEYS).toHaveLength(630);
    expect(new Set(TOPIC_PAIR_KEYS).size).toBe(630);
    expect(TOPIC_PAIR_KEYS).toContain('bitmasks+dp');
  });
});

describe('isTopicTag', () => {
  it('accepts topic tags', () => {
    expect(isTopicTag('dp')).toBe(true);
    expect(isTopicTag('2-sat')).toBe(true);
  });

  it('rejects *special, unknown and non-string values', () => {
    expect(isTopicTag('*special')).toBe(false);
    expect(isTopicTag('DP')).toBe(false);
    expect(isTopicTag(undefined)).toBe(false);
  });
});

describe('pairKey', () => {
  it('sorts alphabetically and joins with +', () => {
    expect(pairKey('dp', 'bitmasks')).toBe('bitmasks+dp');
    expect(pairKey('bitmasks', 'dp')).toBe('bitmasks+dp');
    expect(pairKey('trees', '2-sat')).toBe('2-sat+trees');
  });

  it('throws a ValidationError for equal, unknown or special tags', () => {
    expect(() => pairKey('dp', 'dp')).toThrow(ValidationError);
    expect(() => pairKey('dp', 'nope')).toThrow(ValidationError);
    expect(() => pairKey('*special', 'dp')).toThrow(/two distinct topic tags/);
  });
});
