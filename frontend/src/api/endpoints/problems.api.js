import { apiClient, unwrapWithMeta } from '../client.js';

/** @returns {Promise<{ data: object[], meta: { strategy, strategies, problem } }>} */
export const fetchSimilar = async (problemId, { k = 10 } = {}, options = {}) =>
  unwrapWithMeta(await apiClient.get(`/api/v1/problems/${problemId}/similar`, { ...options, params: { k } }));
