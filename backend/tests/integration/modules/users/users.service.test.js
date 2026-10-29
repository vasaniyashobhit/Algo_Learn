import { describe, expect, it } from 'vitest';
import { getProfile, updateProfile } from '../../../../src/modules/users/users.service.js';
import { User } from '../../../../src/modules/users/user.model.js';
import { useTestDB } from '../../../helpers/db.js';
import { makeUser, objectId } from '../../../helpers/factories.js';

useTestDB();

const accountGone = expect.objectContaining({ statusCode: 401, code: 'AUTH_INVALID_TOKEN' });

describe('users.service getProfile', () => {
  it('returns the public profile without the password hash', async () => {
    const created = await User.create(makeUser({ name: 'Ada' }));
    const profile = await getProfile(String(created._id));
    expect(profile).toMatchObject({ id: String(created._id), email: created.email, name: 'Ada' });
    expect(profile).not.toHaveProperty('passwordHash');
  });

  it('treats a missing account as an invalid token', async () => {
    await expect(getProfile(String(objectId()))).rejects.toEqual(accountGone);
  });
});

describe('users.service updateProfile', () => {
  it('changes only the name and returns the new profile', async () => {
    const created = await User.create(makeUser({ name: 'Old' }));
    const profile = await updateProfile(String(created._id), { name: 'New Name' });
    expect(profile.name).toBe('New Name');
    const stored = await User.findById(created._id).select('+passwordHash').lean();
    expect(stored).toMatchObject({ name: 'New Name', email: created.email, passwordHash: created.passwordHash });
  });

  it('treats a missing account as an invalid token', async () => {
    await expect(updateProfile(String(objectId()), { name: 'Ghost' })).rejects.toEqual(accountGone);
  });
});
