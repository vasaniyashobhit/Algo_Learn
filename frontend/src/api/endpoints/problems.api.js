import { apiClient, unwrap, unwrapWithMeta } from '../client.js';

const BASE = '/api/v1/problems';

/** @returns {Promise<{ data: object[], meta: { page, limit, total, totalPages } }>} */
export const fetchProblems = async (params, options = {}) => unwrapWithMeta(await apiClient.get(BASE, { ...options, params }));

/** @returns {Promise<object>} the full problem (statement sections, editorial, hasStatement) */
export const fetchProblem = async (problemId, options = {}) => unwrap(await apiClient.get(`${BASE}/${problemId}`, options));

/** @returns {Promise<{ data: object[], meta: { strategy, strategies, problem } }>} */
export const fetchSimilar = async (problemId, { k = 10 } = {}, options = {}) =>
  unwrapWithMeta(await apiClient.get(`${BASE}/${problemId}/similar`, { ...options, params: { k } }));
