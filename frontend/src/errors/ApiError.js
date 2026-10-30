/** Every failed API call becomes one of these (see api/toApiError.js). */
export class ApiError extends Error {
  constructor({
    status = 0,
    code = null,
    message = 'Request failed',
    details = null,
    requestId = null,
    isNetwork = false,
    isTimeout = false,
  } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
    this.requestId = requestId;
    this.isNetwork = isNetwork;
    this.isTimeout = isTimeout;
  }
}

export const isApiError = (error) => error instanceof ApiError;
