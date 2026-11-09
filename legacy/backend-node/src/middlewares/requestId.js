import { randomUUID } from 'node:crypto';

export const REQUEST_ID_HEADER = 'X-Request-Id';
const SAFE_ID = /^[\w.-]{1,64}$/;

/** Reuses a safe incoming X-Request-Id (e.g. from a proxy) or generates a UUID. */
export const requestId = (req, res, next) => {
  const incoming = req.get(REQUEST_ID_HEADER);
  req.id = incoming && SAFE_ID.test(incoming) ? incoming : randomUUID();
  res.set(REQUEST_ID_HEADER, req.id);
  next();
};
