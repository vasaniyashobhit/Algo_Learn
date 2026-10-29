import express from 'express';
import { createApp } from '../../src/app.js';
import { createLogger } from '../../src/lib/logger.js';
import { requestId } from '../../src/middlewares/requestId.js';
import { createErrorHandler } from '../../src/middlewares/errorHandler.js';

export const silentLogger = createLogger({ level: 'silent' });

export const TEST_JWT_SECRET = 't'.repeat(32);
/** Cheap bcrypt cost (4) keeps route tests fast; the service tests check the real default of 12. */
export const TEST_AUTH = Object.freeze({ jwtSecret: TEST_JWT_SECRET, jwtExpiresIn: '1h', hashRounds: 4 });
const GENEROUS_LIMIT = { windowMs: 60_000, limit: 1_000 };

/** Full app with a silent logger, test auth config and generous rate limits unless overridden. */
export const createTestApp = (options = {}) =>
  createApp({
    logger: silentLogger,
    rateLimit: GENEROUS_LIMIT,
    auth: TEST_AUTH,
    authRateLimit: GENEROUS_LIMIT,
    ...options,
  });

/**
 * Minimal app for middleware tests: requestId → json → `setup(app)` → errorHandler.
 * Lets a test throw any error from a route and assert the normalized response.
 */
export const createMiniApp = (setup, { isProduction = false, logger = silentLogger } = {}) => {
  const app = express();
  app.use(requestId);
  app.use(express.json());
  setup(app);
  app.use(createErrorHandler({ isProduction, logger }));
  return app;
};

/** Mini app with one GET /boom route that forwards `err` to the error handler. */
export const createThrowingApp = (err, options) =>
  createMiniApp((app) => {
    app.get('/boom', async () => {
      throw err;
    });
  }, options);
