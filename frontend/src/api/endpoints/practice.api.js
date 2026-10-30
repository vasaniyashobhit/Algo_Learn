import { apiClient, unwrap, unwrapWithMeta } from '../client.js';

const BASE = '/api/v1/practice';

/** "1950/F2" → "/api/v1/practice/1950/F2" (the id already has the contest/index shape). */
export const practicePath = (problemId) => `${BASE}/${problemId}`;

/** @returns {Promise<{ data: object[], meta: { total, status } }>} newest first */
export const fetchPractice = async (status, options = {}) =>
  unwrapWithMeta(await apiClient.get(BASE, { ...options, params: status ? { status } : undefined }));

/** @returns {Promise<object>} the created item */
export const addPractice = async ({ problemId, addedFrom = 'manual' }) =>
  unwrap(await apiClient.post(BASE, { problemId, addedFrom }));

/** @returns {Promise<object>} the updated item */
export const updatePractice = async ({ problemId, status }) =>
  unwrap(await apiClient.patch(practicePath(problemId), { status }));

/** @returns {Promise<object>} the deleted item */
export const removePractice = async ({ problemId }) => unwrap(await apiClient.delete(practicePath(problemId)));
