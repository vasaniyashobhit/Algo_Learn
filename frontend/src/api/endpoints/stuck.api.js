import { apiClient, unwrap, unwrapWithMeta } from '../client.js';

const BASE = '/api/v1/stuck';

// The server answers within 55 s (one shared 50 s deadline for reading, fetching and the AI).
export const STUCK_TIMEOUT_MS = 60_000;

/** POST /stuck as multipart (FormData from lib/stuckInput). @returns {Promise<object>} the result */
export const submitStuck = async (form) => unwrap(await apiClient.post(BASE, form, { timeout: STUCK_TIMEOUT_MS }));

/** @returns {Promise<object>} the same result POST /stuck returned */
export const fetchStuck = async (id, options = {}) => unwrap(await apiClient.get(`${BASE}/${id}`, options));

/** @returns {Promise<{ id, kind, solution, editorial, notice, similarWithEditorial }>} */
export const fetchStuckSolution = async (id, options = {}) =>
  unwrap(await apiClient.get(`${BASE}/${id}/solution`, options));

/** @returns {Promise<{ data: object[], meta: { page, limit, total, totalPages } }>} newest first */
export const fetchStuckHistory = async (page = 1, options = {}) =>
  unwrapWithMeta(await apiClient.get(`${BASE}/history`, { ...options, params: { page } }));

/** @returns {Promise<{ id: string, deleted: true }>} */
export const deleteStuck = async (id) => unwrap(await apiClient.delete(`${BASE}/${id}`));
