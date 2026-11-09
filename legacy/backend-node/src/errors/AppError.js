/** Base class for every error we send to clients on purpose. */
export class AppError extends Error {
  constructor(statusCode, code, message, details = null, { cause } = {}) {
    super(message, cause === undefined ? undefined : { cause });
    this.name = new.target.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details ?? null;
    this.isOperational = true;
  }
}

export const isAppError = (err) => err instanceof AppError;
