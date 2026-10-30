import { ApiError, isApiError } from '../errors/ApiError.js';

const TIMEOUT_CODES = new Set(['ECONNABORTED', 'ETIMEDOUT']);

const headerRequestId = (headers) => headers?.['x-request-id'] ?? headers?.get?.('x-request-id') ?? null;

/** Turns an axios failure (or anything thrown) into an ApiError. Never keeps stack traces. */
export const toApiError = (error) => {
  if (isApiError(error)) return error;
  if (TIMEOUT_CODES.has(error?.code)) {
    return new ApiError({ message: 'Request timed out', isTimeout: true });
  }
  const response = error?.response;
  if (!response) {
    return new ApiError({ message: 'Network error', isNetwork: true });
  }
  const body = response.data?.error ?? {};
  return new ApiError({
    status: response.status,
    code: typeof body.code === 'string' ? body.code : null,
    message: typeof body.message === 'string' ? body.message : `HTTP ${response.status}`,
    details: body.details ?? null,
    requestId: body.requestId ?? headerRequestId(response.headers),
  });
};
