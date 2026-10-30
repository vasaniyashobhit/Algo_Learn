import { apiClient, unwrap } from '../client.js';

/** @returns {Promise<{ topicTags: string[], allTags: string[] }>} */
export const fetchTags = async (options = {}) => unwrap(await apiClient.get('/api/v1/meta/tags', options));
