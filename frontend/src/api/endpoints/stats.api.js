import { apiClient, unwrapWithMeta } from '../client.js';

const BASE = '/api/v1/users/me/stats';

/** @returns {Promise<{ data: object, meta: { cfHandle, cfRating, lastSyncedAt, reason? } }>} */
export const fetchStatsSummary = async (options = {}) => unwrapWithMeta(await apiClient.get(`${BASE}/summary`, options));

/**
 * Topic stats. `kind` single | pair, `sort` strength | attempted, `limit` 1–630.
 * @returns {Promise<{ data: object[], meta: { total, lastSyncedAt, reason? } }>}
 */
export const fetchTopicStats = async ({ kind = 'single', sort = 'strength', limit = 50 } = {}, options = {}) =>
  unwrapWithMeta(await apiClient.get(BASE, { ...options, params: { kind, sort, limit } }));
