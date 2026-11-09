import { User } from '../../src/modules/users/user.model.js';
import { createSyncService } from '../../src/modules/sync/sync.service.js';
import { makeUser } from './factories.js';

/** Small pages so pagination is cheap to exercise; no cooldown (the cooldown tests set their own). */
export const TEST_SYNC = Object.freeze({ lockMs: 5 * 60_000, pageSize: 5, maxPages: 3, cooldownMs: 0 });

export const createLinkedUser = (overrides = {}) =>
  User.create(makeUser({ cfHandle: 'Ada_L', ...overrides }));

export const createTestSyncService = (client, options = {}) =>
  createSyncService({ client, settings: TEST_SYNC, ...options });

export const reloadUser = (id) => User.findById(id).lean();
