import { describe, expect, it } from 'vitest';
import { PracticeItem } from '../../../src/modules/practice/practiceItem.model.js';
import { useTestDB } from '../../helpers/db.js';
import { makePracticeItem, objectId } from '../../helpers/factories.js';
import { expectDuplicateKey, invalidPaths } from '../../helpers/assertions.js';

useTestDB();

describe('PracticeItem model', () => {
  it('requires userId and problemId', () => {
    expect(invalidPaths(PracticeItem, {}).toSorted()).toEqual(['problemId', 'userId']);
  });

  it('validates status and addedFrom', () => {
    expect(invalidPaths(PracticeItem, makePracticeItem({ status: 'done' }))).toEqual(['status']);
    expect(invalidPaths(PracticeItem, makePracticeItem({ addedFrom: 'friend' }))).toEqual(['addedFrom']);
    expect(invalidPaths(PracticeItem, makePracticeItem({ status: 'skipped', addedFrom: 'stuck' }))).toEqual([]);
  });

  it('defaults to status todo, addedFrom manual, with timestamps', async () => {
    const saved = await PracticeItem.create(makePracticeItem());
    expect(saved).toMatchObject({ status: 'todo', addedFrom: 'manual' });
    expect(saved.createdAt).toBeInstanceOf(Date);
    expect(saved.updatedAt).toBeInstanceOf(Date);
  });

  it('is unique per userId + problemId (409), but another user may add the same problem', async () => {
    const userId = objectId();
    await PracticeItem.create(makePracticeItem({ userId, problemId: '1/A' }));
    await PracticeItem.create(makePracticeItem({ problemId: '1/A' }));
    await expectDuplicateKey(
      PracticeItem.create(makePracticeItem({ userId, problemId: '1/A' })),
      ['userId', 'problemId'],
    );
  });

  it('toJSON removes __v and keeps _id', async () => {
    const json = (await PracticeItem.create(makePracticeItem())).toJSON();
    expect(json).toHaveProperty('_id');
    expect(json).not.toHaveProperty('__v');
  });
});
