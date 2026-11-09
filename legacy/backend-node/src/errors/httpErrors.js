import { AppError } from './AppError.js';
import { codes } from './codes.js';

export class ValidationError extends AppError {
  constructor(code = codes.VALIDATION_FAILED, message = 'Request validation failed', details, options) {
    super(400, code, message, details, options);
  }
}

export class AuthError extends AppError {
  constructor(code = codes.AUTH_REQUIRED, message = 'Authentication required', details, options) {
    super(401, code, message, details, options);
  }
}

export class ForbiddenError extends AppError {
  constructor(code = codes.FORBIDDEN, message = 'You cannot access this resource', details, options) {
    super(403, code, message, details, options);
  }
}

export class NotFoundError extends AppError {
  constructor(code = codes.NOT_FOUND, message = 'Resource not found', details, options) {
    super(404, code, message, details, options);
  }
}

export class ConflictError extends AppError {
  constructor(code = codes.DUPLICATE_RESOURCE, message = 'Resource already exists', details, options) {
    super(409, code, message, details, options);
  }
}

/** 413 for FILE_TOO_LARGE, 415 for everything else (unsupported type). */
export class PayloadError extends AppError {
  constructor(code = codes.FILE_TYPE_UNSUPPORTED, message = 'Unsupported payload', details, options) {
    super(code === codes.FILE_TOO_LARGE ? 413 : 415, code, message, details, options);
  }
}

export class RateLimitError extends AppError {
  constructor(code = codes.RATE_LIMITED, message = 'Too many requests', details, options) {
    super(429, code, message, details, options);
  }
}

/** 502 by default (bad upstream response); pass `{ statusCode: 503 }` when it is unavailable. */
export class ExternalServiceError extends AppError {
  constructor(code, message = 'An external service failed', details, { statusCode = 502, cause } = {}) {
    super(statusCode, code, message, details, { cause });
  }
}

/** 422: the input was received but could not be turned into anything usable (e.g. unreadable file). */
export class UnprocessableError extends AppError {
  constructor(code = codes.INPUT_UNREADABLE, message = 'The input could not be read', details, options) {
    super(422, code, message, details, options);
  }
}
