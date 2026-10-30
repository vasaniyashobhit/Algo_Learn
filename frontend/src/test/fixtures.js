export const TEST_TOKEN = 'test-token';

export const testUser = {
  id: '65f1c2b8e4a1b2c3d4e5f601',
  email: 'ananya.k@example.in',
  name: 'Ananya K',
  cfHandle: null,
  cfRating: null,
  cfMaxRating: null,
  lastSyncedAt: null,
  createdAt: '2026-10-29T14:00:00.000Z',
  updatedAt: '2026-10-29T14:00:00.000Z',
};

/** A backend error envelope. */
export const errorBody = (code, message, details = null, requestId = 'req-123') => ({
  success: false,
  error: { code, message, details, requestId },
});
