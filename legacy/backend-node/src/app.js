import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { pinoHttp } from 'pino-http';
import { logger as defaultLogger } from './lib/logger.js';
import { requestId } from './middlewares/requestId.js';
import { createRateLimiter, AUTH_RATE_LIMIT, DEFAULT_RATE_LIMIT } from './middlewares/rateLimit.js';
import { notFound } from './middlewares/notFound.js';
import { createErrorHandler } from './middlewares/errorHandler.js';
import { API_BASE_PATH, createApiRouter } from './routes.js';
import { createAuth } from './modules/auth/auth.module.js';
import { createServices } from './services.js';
import { STUCK } from './config/constants.js';

export const BODY_LIMIT = '1mb';

/**
 * Builds the Express app without listening. Order:
 * requestId → pino-http → helmet → cors → json/urlencoded → rate limit → routes → notFound → errorHandler.
 */
export const createApp = ({
  isProduction = false,
  clientUrl = 'http://localhost:5173',
  logger = defaultLogger,
  rateLimit = DEFAULT_RATE_LIMIT,
  trustProxy = false,
  auth,
  authRateLimit = AUTH_RATE_LIMIT,
  stuckRateLimit = STUCK.rateLimit,
  services = createServices({ logger }),
  cronSecret,
} = {}) => {
  if (!auth?.jwtSecret) throw new TypeError('createApp(): auth.jwtSecret is required');
  const app = express();
  app.set('trust proxy', trustProxy);

  app.use(requestId);
  app.use(pinoHttp({ logger, genReqId: (req) => req.id }));
  app.use(helmet());
  app.use(cors({ origin: clientUrl, credentials: true, exposedHeaders: ['X-Request-Id'] }));
  app.use(express.json({ limit: BODY_LIMIT }));
  app.use(express.urlencoded({ extended: false, limit: BODY_LIMIT }));
  app.use('/api', createRateLimiter(rateLimit));

  app.use(API_BASE_PATH, createApiRouter({
    auth: createAuth(auth), authRateLimit, stuckRateLimit, services, cronSecret,
  }));

  app.use(notFound);
  app.use(createErrorHandler({ isProduction, logger }));
  return app;
};
