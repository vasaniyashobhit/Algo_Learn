import { describe, expect, it, vi } from 'vitest';
import { useTestDB } from '../../../helpers/db.js';
import { problemAt, seedProblems } from '../../../helpers/problems.js';
import { makeUser, objectId } from '../../../helpers/factories.js';
import { createPracticeService } from '../../../../src/modules/practice/practice.service.js';
import { PracticeItem } from '../../../../src/modules/practice/practiceItem.model.js';
import { User } from '../../../../src/modules/users/user.model.js';

useTestDB();

describe('practice service', () => {
  it('add answers 401 AUTH_INVALID_TOKEN for a deleted account', async () => {
    await seedProblems([problemAt('1/A')]);
    await expect(createPracticeService().add(objectId(), { problemId: '1/A', addedFrom: 'manual' }))
      .rejects.toMatchObject({ statusCode: 401, code: 'AUTH_INVALID_TOKEN' });
  });

  it('maps a duplicate key to PRACTICE_ITEM_EXISTS with the cause kept', async () => {
    await seedProblems([problemAt('1/A')]);
    const user = await User.create(makeUser());
    const service = createPracticeService();
    await service.add(user._id, { problemId: '1/A', addedFrom: 'manual' });
    const err = await service.add(user._id, { problemId: '1/A', addedFrom: 'stuck' }).catch((e) => e);
    expect(err).toMatchObject({ statusCode: 409, code: 'PRACTICE_ITEM_EXISTS', details: { problemId: '1/A' } });
    expect(err.cause.code).toBe(11000);
  });

  it('re-throws other create failures unchanged', async () => {
    await seedProblems([problemAt('1/A')]);
    const user = await User.create(makeUser());
    const boom = new Error('write failed');
    const FakeItem = { create: vi.fn(async () => { throw boom; }) };
    await expect(createPracticeService({ PracticeItem: FakeItem }).add(user._id, { problemId: '1/A' })).rejects.toBe(boom);
  });

  it('update and remove only touch the caller’s item', async () => {
    await seedProblems([problemAt('1/A')]);
    const [alice, bob] = await User.create([makeUser(), makeUser()]);
    await PracticeItem.create({ userId: alice._id, problemId: '1/A' });
    const service = createPracticeService();
    await expect(service.update(bob._id, '1/A', { status: 'solved' })).rejects.toMatchObject({ code: 'NOT_FOUND' });
    await expect(service.remove(bob._id, '1/A')).rejects.toMatchObject({ code: 'NOT_FOUND' });
    expect(await PracticeItem.findOne({ userId: alice._id }).lean()).toMatchObject({ status: 'todo' });
  });

  it('lists an empty practice list without querying problems', async () => {
    const find = vi.fn();
    const { items, meta } = await createPracticeService({ Problem: { find } }).list(objectId());
    expect(items).toEqual([]);
    expect(meta).toEqual({ total: 0, status: null });
    expect(find).not.toHaveBeenCalled();
  });
});
