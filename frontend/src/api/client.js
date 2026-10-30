import axios from 'axios';
import { SESSION_ENDING_CODES } from '../errors/codes.js';
import { authStore } from '../lib/authStore.js';
import { toApiError } from './toApiError.js';

export const DEFAULT_TIMEOUT_MS = 15_000;

const endsSession = (apiError, config) =>
  apiError.status === 401 &&
  SESSION_ENDING_CODES.includes(apiError.code) &&
  Boolean(config?.headers?.Authorization);

/**
 * axios instance with a Bearer token, a 15 s default timeout (override per request with
 * `{ timeout }`) and errors converted to ApiError. A rejected token ends the session.
 */
export const createApiClient = ({ getToken, onSessionEnded, baseURL = import.meta.env.VITE_API_URL ?? '' }) => {
  const client = axios.create({ baseURL, timeout: DEFAULT_TIMEOUT_MS, headers: { Accept: 'application/json' } });

  client.interceptors.request.use((config) => {
    const token = getToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  });

  client.interceptors.response.use(
    (response) => response,
    async (error) => {
      const apiError = toApiError(error);
      if (endsSession(apiError, error?.config)) onSessionEnded(apiError);
      throw apiError;
    },
  );

  return client;
};

export const apiClient = createApiClient({ getToken: authStore.getToken, onSessionEnded: authStore.expire });

/** The `data` of a success envelope. */
export const unwrap = (response) => response.data.data;

/** `data` plus `meta` (empty object when absent), for lists and the stats/recommendation reasons. */
export const unwrapWithMeta = (response) => ({ data: response.data.data, meta: response.data.meta ?? {} });
