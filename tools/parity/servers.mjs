import { spawn, spawnSync } from 'node:child_process';
import { createWriteStream, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { waitForHealth } from './client.mjs';

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const LEGACY_PORT = 4001;
export const SPRING_PORT = 4000;
export const CRON_SECRET = 'e2e-cron-secret-0123456789';
const isWindows = process.platform === 'win32';

export const legacyAvailable = () => existsSync(path.join(root, 'legacy/backend-node/node_modules'));

/** Starts one E2E backend with E2E=1 on `port`; its output goes to tools/parity/logs/<name>.log. */
const start = (name, script, port) => {
  mkdirSync(path.join(root, 'tools/parity/logs'), { recursive: true });
  const log = createWriteStream(path.join(root, `tools/parity/logs/${name}.log`));
  const child = spawn(process.execPath, [script], {
    cwd: root,
    env: { ...process.env, E2E: '1', E2E_API_PORT: String(port), LOG_LEVEL: 'warn' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  child.stdout.pipe(log);
  child.stderr.pipe(log);
  return { name, child, base: `http://localhost:${port}/api/v1` };
};

const stop = ({ child }) => {
  if (child.exitCode !== null) return;
  if (isWindows) spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
  else child.kill('SIGTERM');
};

/** Starts the legacy E2E server (4001, when its packages are installed) and the Spring e2e backend (4000). */
export const startServers = async ({ withLegacy }) => {
  const servers = [];
  if (withLegacy) servers.push(start('legacy', 'tools/parity/legacy/server.js', LEGACY_PORT));
  servers.push(start('spring', 'e2e/server/start.js', SPRING_PORT));
  const stopAll = () => servers.forEach(stop);
  try {
    await Promise.all(servers.map(({ base }) => waitForHealth(base, 240_000)));
  } catch (err) {
    stopAll();
    throw err;
  }
  return { servers, stopAll };
};
