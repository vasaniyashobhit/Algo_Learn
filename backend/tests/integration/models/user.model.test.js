import { describe, expect, it } from 'vitest';
import { User } from '../../../src/modules/users/user.model.js';
import { useTestDB } from '../../helpers/db.js';
import { makeUser } from '../../helpers/factories.js';
import { expectDuplicateKey, invalidPaths } from '../../helpers/assertions.js';

useTestDB();

describe('User model', () => {
  it('requires email and passwordHash', () => {
    expect(invalidPaths(User, {}).toSorted()).toEqual(['email', 'passwordHash']);
  });

  it('validates email and Codeforces handle formats', () => {
    expect(invalidPaths(User, makeUser({ email: 'not-an-email' }))).toEqual(['email']);
    expect(invalidPaths(User, makeUser({ cfHandle: 'a b' }))).toEqual(['cfHandle']);
    expect(invalidPaths(User, makeUser({ cfHandle: 'tourist' }))).toEqual([]);
  });

  it('lowercases and trims the email, and applies null/empty defaults', async () => {
    const user = await User.create(makeUser({ email: '  Alice@Example.COM ' }));
    expect(user.email).toBe('alice@example.com');
    expect(user).toMatchObject({
      name: expect.any(String),
      cfRating: null,
      cfMaxRating: null,
      lastSyncedAt: null,
      lastSubmissionId: null,
      syncLockedUntil: null,
    });
    expect(user.cfHandle).toBeUndefined();
  });

  it('hides passwordHash from queries unless selected', async () => {
    const { _id } = await User.create(makeUser());
    expect((await User.findById(_id).lean()).passwordHash).toBeUndefined();
    expect((await User.findById(_id).select('+passwordHash').lean()).passwordHash).toBe('$2b$10$hash');
  });

  it('toJSON removes passwordHash and __v but keeps _id', async () => {
    const json = (await User.create(makeUser())).toJSON();
    expect(json).toHaveProperty('_id');
    expect(json).toHaveProperty('email');
    expect(json).not.toHaveProperty('passwordHash');
    expect(json).not.toHaveProperty('__v');
  });

  it('rejects a duplicate email regardless of case (409)', async () => {
    await User.create(makeUser({ email: 'dup@example.com' }));
    await expectDuplicateKey(User.create(makeUser({ email: 'DUP@example.com' })), ['email']);
  });
});
