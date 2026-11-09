import { pathToFileURL } from 'node:url';
import { parseScriptEnv } from '../config/env.js';
import { createLogger } from '../lib/logger.js';
import { connectDB, disconnectDB } from '../db/connect.js';

/** True when `moduleUrl` is the file Node was started with (`node src/scripts/x.js`). */
export const isEntryPoint = (moduleUrl, argv = process.argv) =>
  Boolean(argv[1]) && moduleUrl === pathToFileURL(argv[1]).href;

/**
 * Connects the DB, runs `task({ env, logger })`, prints its summary and always disconnects.
 * Returns the summary; errors are logged and re-thrown so the caller can set the exit code.
 */
export const runScript = async (name, task, {
  source = process.env,
  db = { connect: connectDB, disconnect: disconnectDB },
  print = console.log,
  makeLogger = createLogger,
} = {}) => {
  const env = parseScriptEnv(source);
  const logger = makeLogger({ level: env.LOG_LEVEL });
  await db.connect(env.MONGODB_URI, { logger });
  try {
    const summary = await task({ env, logger });
    print(`\n${name} summary\n${JSON.stringify(summary, null, 2)}`);
    return summary;
  } catch (err) {
    logger.error({ err }, `${name} failed`);
    throw err;
  } finally {
    await db.disconnect({ logger });
  }
};

/** Entry-point wrapper: runs the script and exits with 1 (message on stderr) on failure. */
export const runAsMain = async (name, task, { exit = process.exit, ...options } = {}) => {
  try {
    await runScript(name, task, options);
  } catch (err) {
    console.error(`${name} failed: ${err.message}`);
    exit(1);
  }
};
