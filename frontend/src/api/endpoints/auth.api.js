import { apiClient, unwrap } from '../client.js';

const BASE = '/api/v1/auth';

/** @returns {Promise<{ token: string, user: object }>} */
export const signup = async (body) => unwrap(await apiClient.post(`${BASE}/signup`, body));

/** @returns {Promise<{ token: string, user: object }>} */
export const login = async (body) => unwrap(await apiClient.post(`${BASE}/login`, body));

/** @returns {Promise<object>} the public user */
export const fetchMe = async (options = {}) => unwrap(await apiClient.get(`${BASE}/me`, options));
