import { once } from 'node:events';
import { pathToFileURL } from 'node:url';
import { createApp } from './app.js';
import { getEnv } from './config/env.js';
import { createLogger } from './lib/logger.js';
import { registerGracefulShutdown } from './lib/gracefulShutdown.js';
import { connectDB, disconnectDB } from './db/connect.js';
import { createServices } from './services.js';
import { createLlm } from './modules/llm/llm.module.js';
import { startScheduler } from './jobs/scheduler.js';

const listen = async (expressApp, port) => {
  const server = expressApp.listen(port);
  await once(server, 'listening');
  return server;
};

/**
 * Connects the DB, then starts HTTP and the cron scheduler, and wires graceful shutdown
 * (which stops the scheduler and closes the DB). Resolves once listening. If HTTP fails
 * to start, the DB connection is closed again. The real LLM chain (createLlm) is built from env.
 */
export const startServer = async ({
  env,
  logger,
  app,
  proc = process,
  exit,
  db = { connect: connectDB, disconnect: disconnectDB },
  services = createServices({ logger, llm: createLlm({ env, logger }) }),
  scheduler = startScheduler,
} = {}) => {
  await db.connect(env.MONGODB_URI, { logger });
  const expressApp = app ?? createApp({
    isProduction: env.isProduction,
    clientUrl: env.CLIENT_URL,
    logger,
    trustProxy: env.isProduction ? 1 : false,
    auth: { jwtSecret: env.JWT_SECRET, jwtExpiresIn: env.JWT_EXPIRES_IN },
    services,
    cronSecret: env.CRON_SECRET,
  });
  let server;
  try {
    server = await listen(expressApp, env.PORT);
  } catch (err) {
    await db.disconnect({ logger });
    throw err;
  }
  logger.info({ port: server.address().port, env: env.NODE_ENV }, 'CP Coach API listening');
  const cron = scheduler({ env, jobs: services.jobs, logger });
  const onClose = async () => {
    await cron.stop();
    await services.ocr?.terminate();
    await db.disconnect({ logger });
  };
  const shutdown = registerGracefulShutdown({ server, logger, onClose, proc, exit });
  return { server, shutdown, cron };
};

const isEntryPoint = () =>
  Boolean(process.argv[1]) && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isEntryPoint()) {
  try {
    const env = getEnv();
    await startServer({ env, logger: createLogger({ level: env.LOG_LEVEL }) });
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}
