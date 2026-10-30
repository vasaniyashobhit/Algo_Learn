import { apiClient, unwrap } from '../client.js';

const BASE = '/api/v1/users/me';

// The first sync of a large account reads up to 20 pages through the Codeforces limiter.
export const SYNC_TIMEOUT_MS = 120_000;
// Linking calls Codeforces user.info (retried on timeouts), so it gets more than the default.
export const LINK_TIMEOUT_MS = 30_000;

/** @returns {Promise<object>} the user with cfHandle, cfRating and cfMaxRating set */
export const linkHandle = async (handle) => unwrap(await apiClient.put(`${BASE}/handle`, { handle }, { timeout: LINK_TIMEOUT_MS }));

/** @returns {Promise<object>} the user without a handle (submissions and stats are deleted) */
export const unlinkHandle = async () => unwrap(await apiClient.delete(`${BASE}/handle`));

/** @returns {Promise<{ newSubmissions: number, totalSubmissions: number, lastSyncedAt: string, pending: object[] }>} */
export const syncNow = async () => unwrap(await apiClient.post(`${BASE}/sync`, null, { timeout: SYNC_TIMEOUT_MS }));

/** @returns {Promise<object>} the user with the new display name */
export const updateMe = async (body) => unwrap(await apiClient.patch(BASE, body));
