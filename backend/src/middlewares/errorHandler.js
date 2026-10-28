import { toAppError } from '../errors/mappers/index.js';

const buildBody = (appError, err, requestId, isProduction) => {
  const error = {
    code: appError.code,
    message: appError.message,
    details: appError.details ?? null,
    requestId: requestId ?? null,
  };
  if (!isProduction) error.stack = err?.stack;
  return { success: false, error };
};

/**
 * Last middleware in the chain. Normalizes any error to the shared error shape,
 * logs it with the requestId, and never exposes stack traces in production.
 */
export const createErrorHandler = ({ isProduction, logger }) => (err, req, res, next) => {
  const appError = toAppError(err);
  const log = req.log ?? logger;
  const level = appError.statusCode >= 500 ? 'error' : 'warn';
  log[level]({ err, code: appError.code, requestId: req.id }, appError.message);

  if (res.headersSent) return next(err);
  res.status(appError.statusCode).json(buildBody(appError, err, req.id, isProduction));
};
