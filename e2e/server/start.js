import { MongoMemoryServer } from 'mongodb-memory-server';
import { createApp } from '../../backend/src/app.js';
import { createServices } from '../../backend/src/services.js';
import { connectDB, disconnectDB } from '../../backend/src/db/connect.js';
import { createLogger } from '../../backend/src/lib/logger.js';
import { createFakeCodeforces } from './fakeCodeforces.js';
import { createFakeLlm } from './fakeLlm.js';
import { seedProblems } from './seedProblems.js';

// The test backend only runs behind the E2E flag, so fakes can never be started by accident.
if (process.env.E2E !== '1') {
  console.error('Refusing to start: the E2E test backend needs E2E=1.');
  process.exit(1);
}

export const E2E_PORT = Number(process.env.E2E_API_PORT ?? 4100);
export const CRON_SECRET = 'e2e-cron-secret-0123456789';
const RELAXED = { windowMs: 60_000, limit: 10_000 };
const logger = createLogger({ level: process.env.LOG_LEVEL ?? 'warn' });
const noOcr = { recognize: async () => '', terminate: async () => {} };

const mongo = await MongoMemoryServer.create();
try {
  await connectDB(mongo.getUri('algolearn-e2e'), { logger });
  await seedProblems();
} catch (err) {
  console.error(err);
  await mongo.stop();
  process.exit(1);
}

const app = createApp({
  isProduction: true,
  clientUrl: process.env.CLIENT_URL ?? 'http://localhost:5174',
  logger,
  rateLimit: RELAXED,
  authRateLimit: RELAXED,
  stuckRateLimit: RELAXED,
  auth: { jwtSecret: 'e2e-jwt-secret-that-is-long-enough-0123456789', jwtExpiresIn: '1h' },
  services: createServices({ logger, client: createFakeCodeforces(), llm: createFakeLlm({ logger }), ocr: noOcr }),
  cronSecret: CRON_SECRET,
});

const server = app.listen(E2E_PORT, () => logger.warn({ port: E2E_PORT }, 'E2E test backend ready'));

const stop = async () => {
  server.close();
  await disconnectDB({ logger });
  await mongo.stop();
  process.exit(0);
};
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
