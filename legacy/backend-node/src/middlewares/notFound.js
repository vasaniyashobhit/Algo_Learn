import { NotFoundError } from '../errors/httpErrors.js';
import { codes } from '../errors/codes.js';

export const notFound = (req, _res, next) => {
  next(new NotFoundError(codes.ROUTE_NOT_FOUND, `Route ${req.method} ${req.path} not found`));
};
