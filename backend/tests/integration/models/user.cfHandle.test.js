import { describe, expect, it } from 'vitest';
import { User } from '../../../src/modules/users/user.model.js';
import { useTestDB } from '../../helpers/db.js';
import { makeUser } from '../../helpers/factories.js';
import { expectDuplicateKey, indexesByName } from '../../helpers/assertions.js';

useTestDB();

describe('User cfHandle unique index', () => {
  it('is unique, partial on strings and case-insensitive', async () => {
    const { cfHandle_1: index } = await indexesByName(User);
    expect(index.unique).toBe(true);
    expect(index.partialFilterExpression).toEqual({ cfHandle: { $type: 'string' } });
    expect(index.collation).toMatchObject({ locale: 'en', strength: 2 });
  });

  it('allows many users without a handle, including explicit null', async () => {
    await User.create([makeUser(), makeUser(), makeUser({ cfHandle: null }), makeUser({ cfHandle: null })]);
    expect(await User.countDocuments()).toBe(4);
  });

  it('rejects the same handle twice, ignoring case (409)', async () => {
    await User.create(makeUser({ cfHandle: 'Tourist' }));
    await expectDuplicateKey(User.create(makeUser({ cfHandle: 'tourist' })), ['cfHandle']);
  });
});
