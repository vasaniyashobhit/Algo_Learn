import mongoose from 'mongoose';
import { ExternalServiceError } from '../../errors/httpErrors.js';
import { codes } from '../../errors/codes.js';

const CONNECTED = 1;

/** `up` when Mongoose holds an open connection, else `down` (connecting, disconnected...). */
export const dbState = (connection = mongoose.connection) => (connection.readyState === CONNECTED ? 'up' : 'down');

const snapshot = (db) => ({
  status: db === 'up' ? 'ok' : 'degraded',
  db,
  uptime: process.uptime(),
  time: new Date().toISOString(),
});

/** Liveness: always 200 while the process answers (hosts and uptime pingers use this). */
export const getHealth = async (_req, res, next) => {
  try {
    res.json({ success: true, data: snapshot(dbState()) });
  } catch (err) {
    next(err);
  }
};

/** Readiness: 503 DB_UNAVAILABLE until MongoDB is connected (deploy checks, load balancers). */
export const getReady = async (_req, res, next) => {
  try {
    const db = dbState();
    if (db !== 'up') throw new ExternalServiceError(codes.DB_UNAVAILABLE, 'Database is not connected', null, { statusCode: 503 });
    res.json({ success: true, data: snapshot(db) });
  } catch (err) {
    next(err);
  }
};
