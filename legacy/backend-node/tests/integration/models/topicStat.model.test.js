import { describe, expect, it } from 'vitest';
import { TopicStat, isValidTopicKey } from '../../../src/modules/stats/topicStat.model.js';
import { useTestDB } from '../../helpers/db.js';
import { makeTopicStat, objectId } from '../../helpers/factories.js';
import { expectDuplicateKey, indexesByName, invalidPaths } from '../../helpers/assertions.js';

useTestDB();

describe('isValidTopicKey', () => {
  it('matches single tags and sorted pair keys to their kind', () => {
    expect(isValidTopicKey('single', 'dp')).toBe(true);
    expect(isValidTopicKey('pair', 'bitmasks+dp')).toBe(true);
    expect(isValidTopicKey('pair', 'dp+bitmasks')).toBe(false);
    expect(isValidTopicKey('single', 'bitmasks+dp')).toBe(false);
    expect(isValidTopicKey('single', '*special')).toBe(false);
    expect(isValidTopicKey(undefined, 'dp')).toBe(false);
  });
});

describe('TopicStat model', () => {
  it('requires userId, topicKey and kind', () => {
    expect(invalidPaths(TopicStat, {}).toSorted()).toEqual(['kind', 'topicKey', 'userId']);
  });

  it('rejects an unknown kind, a key that does not match its kind and out-of-range values', () => {
    expect(invalidPaths(TopicStat, makeTopicStat({ kind: 'triple' })).toSorted()).toEqual(['kind', 'topicKey']);
    expect(invalidPaths(TopicStat, makeTopicStat({ kind: 'pair', topicKey: 'dp' }))).toEqual(['topicKey']);
    expect(invalidPaths(TopicStat, makeTopicStat({ strength: 1.2 }))).toEqual(['strength']);
    expect(invalidPaths(TopicStat, makeTopicStat({ solved: -1 }))).toEqual(['solved']);
  });

  it('applies zero counters, null ratings and zero strength by default', async () => {
    const saved = await TopicStat.create(makeTopicStat({ kind: 'pair', topicKey: 'bitmasks+dp' }));
    expect(saved).toMatchObject({
      attempted: 0,
      solved: 0,
      failed: 0,
      avgSolvedRating: null,
      maxSolvedRating: null,
      comfortRating: null,
      strength: 0,
      lastActivityAt: null,
    });
  });

  it('is unique per userId + topicKey (409) but allows the same key for another user', async () => {
    const userId = objectId();
    await TopicStat.create(makeTopicStat({ userId }));
    await TopicStat.create(makeTopicStat());
    await expectDuplicateKey(TopicStat.create(makeTopicStat({ userId })), ['userId', 'topicKey']);
    expect((await indexesByName(TopicStat)).userId_1_topicKey_1.unique).toBe(true);
  });

  it('toJSON removes __v', async () => {
    expect((await TopicStat.create(makeTopicStat())).toJSON()).not.toHaveProperty('__v');
  });
});
