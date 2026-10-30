import { describe, expect, it } from 'vitest';
import { StuckQuery, truncateRawInput } from '../../../src/modules/stuck/stuckQuery.model.js';
import { useTestDB } from '../../helpers/db.js';
import { makeStuckQuery } from '../../helpers/factories.js';
import { indexesByName, invalidPaths } from '../../helpers/assertions.js';

useTestDB();

describe('truncateRawInput', () => {
  it('keeps at most 20k characters and passes non-strings through', () => {
    expect(truncateRawInput('x'.repeat(25_000))).toHaveLength(20_000);
    expect(truncateRawInput('short')).toBe('short');
    expect(truncateRawInput(undefined)).toBeUndefined();
  });
});

describe('StuckQuery model', () => {
  it('requires userId, inputType and source', () => {
    expect(invalidPaths(StuckQuery, {}).toSorted()).toEqual(['inputType', 'source', 'userId']);
  });

  it('validates every enum, including gap statuses', () => {
    expect(invalidPaths(StuckQuery, makeStuckQuery({ inputType: 'video' }))).toEqual(['inputType']);
    expect(invalidPaths(StuckQuery, makeStuckQuery({ tagsSource: 'guess' }))).toEqual(['tagsSource']);
    expect(invalidPaths(StuckQuery, makeStuckQuery({ source: 'magic' }))).toEqual(['source']);
    const gap = [{ topicKey: 'dp', strength: 0.3, status: 'terrible' }];
    expect(invalidPaths(StuckQuery, makeStuckQuery({ gap }))).toEqual(['gap.0.status']);
  });

  it('truncates rawInput to 20k characters on save', async () => {
    const saved = await StuckQuery.create(makeStuckQuery({ rawInput: 'a'.repeat(30_000) }));
    expect(saved.rawInput).toHaveLength(20_000);
  });

  it('applies defaults and sets createdAt only', async () => {
    const saved = await StuckQuery.create(makeStuckQuery({ rawInput: undefined }));
    expect(saved).toMatchObject({
      rawInput: '',
      matchedProblemId: null,
      detectedTags: [],
      estimatedRating: null,
      gap: [],
      result: null,
      solution: null,
    });
    expect(saved.tagsSource).toBeUndefined();
    expect(saved.createdAt).toBeInstanceOf(Date);
    expect(saved.updatedAt).toBeUndefined();
  });

  it('stores gap items without _id and a free-form result', async () => {
    const gap = [{ topicKey: 'bitmasks', strength: 0.3, status: 'weak' }];
    const result = { hints: ['h1'], solution: null };
    const saved = await StuckQuery.create(makeStuckQuery({ gap, result, tagsSource: 'ai', source: 'ai' }));
    const json = saved.toJSON();
    expect(json.gap).toEqual(gap);
    const unseen = [{ topicKey: 'dp+graphs', kind: 'pair', status: 'unseen' }];
    const second = await StuckQuery.create(makeStuckQuery({ gap: unseen }));
    expect(second.toJSON().gap).toEqual([{ ...unseen[0], strength: null }]);
    expect(json.result).toEqual(result);
    expect(json).not.toHaveProperty('__v');
  });

  it('indexes userId + createdAt descending', async () => {
    await StuckQuery.create(makeStuckQuery());
    expect((await indexesByName(StuckQuery))['userId_1_createdAt_-1'].key).toEqual({ userId: 1, createdAt: -1 });
  });
});
