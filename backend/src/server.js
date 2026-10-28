import { once } from 'node:events';
import { pathToFileURL } from 'node:url';
import { createApp } from './app.js';
import { getEnv } from './config/env.js';
import { createLogger } from './lib/logger.js';
import { registerGracefulShutdown } from './lib/gracefulShutdown.js';

/** Starts the HTTP server and wires graceful shutdown. Resolves once listening. */
export const startServer = async ({ env, logger, app, proc = process, exit } = {}) => {
  const expressApp = app ?? createApp({
    isProduction: env.isProduction,
    clientUrl: env.CLIENT_URL,
    logger,
    trustProxy: env.isProduction ? 1 : false,
  });
  const server = expressApp.listen(env.PORT);
  await once(server, 'listening');
  logger.info({ port: server.address().port, env: env.NODE_ENV }, 'CP Coach API listening');
  const shutdown = registerGracefulShutdown({ server, logger, proc, exit });
  return { server, shutdown };
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
