import { apiClient, unwrapWithMeta } from '../client.js';

/** @returns {Promise<{ data: { topics: object[] }, meta: { userRating, coldStart, reason? } }>} */
export const fetchRecommendations = async (options = {}) =>
  unwrapWithMeta(await apiClient.get('/api/v1/recommendations', options));
