import { describe, expect, it } from 'vitest';
import { toPublicUser } from '../../../../src/modules/users/helpers/publicUser.js';
import { objectId } from '../../../helpers/factories.js';

describe('toPublicUser', () => {
  it('keeps the public fields and stringifies the id', () => {
    const _id = objectId();
    const createdAt = new Date('2026-01-01T00:00:00Z');
    const user = {
      _id,
      email: 'a@b.co',
      name: 'Ada',
      cfHandle: 'tourist',
      cfRating: 3500,
      cfMaxRating: 3800,
      lastSyncedAt: createdAt,
      createdAt,
      updatedAt: createdAt,
    };
    expect(toPublicUser(user)).toEqual({ ...user, _id: undefined, id: String(_id) });
    expect(toPublicUser(user)).not.toHaveProperty('_id');
  });

  it('never exposes secrets or internal sync fields', () => {
    const result = toPublicUser({
      _id: objectId(),
      email: 'a@b.co',
      passwordHash: '$2b$12$x',
      syncLockedUntil: new Date(),
      lastSubmissionId: 7,
      __v: 0,
    });
    ['passwordHash', 'syncLockedUntil', 'lastSubmissionId', '__v'].forEach((field) =>
      expect(result).not.toHaveProperty(field));
  });

  it('fills missing optional fields with null', () => {
    expect(toPublicUser({ _id: objectId(), email: 'a@b.co' })).toMatchObject({
      name: null,
      cfHandle: null,
      cfRating: null,
      lastSyncedAt: null,
    });
  });
});
