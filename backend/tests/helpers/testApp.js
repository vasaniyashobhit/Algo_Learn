import express from 'express';
import { createApp } from '../../src/app.js';
import { createLogger } from '../../src/lib/logger.js';
import { requestId } from '../../src/middlewares/requestId.js';
import { createErrorHandler } from '../../src/middlewares/errorHandler.js';

export const silentLogger = createLogger({ level: 'silent' });

/** Full app with a silent logger and a generous rate limit unless overridden. */
export const createTestApp = (options = {}) =>
  createApp({ logger: silentLogger, rateLimit: { windowMs: 60_000, limit: 1_000 }, ...options });

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
