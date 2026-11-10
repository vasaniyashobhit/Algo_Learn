import { spawn, spawnSync } from 'node:child_process';
import { createWriteStream, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { waitForHealth } from './client.mjs';

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const SPRING_PORT = 4000;
const isWindows = process.platform === 'win32';

/** Starts the Spring e2e backend with E2E=1 on `port`; its output goes to tools/parity/logs/spring.log. */
const start = (port) => {
  mkdirSync(path.join(root, 'tools/parity/logs'), { recursive: true });
  const log = createWriteStream(path.join(root, 'tools/parity/logs/spring.log'));
  const child = spawn(process.execPath, ['e2e/server/start.js'], {
    cwd: root,
    env: { ...process.env, E2E: '1', E2E_API_PORT: String(port), LOG_LEVEL: 'warn' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  child.stdout.pipe(log);
  child.stderr.pipe(log);
  return child;
};

const stop = (child) => {
  if (child.exitCode !== null) return;
  if (isWindows) spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
  else child.kill('SIGTERM');
};

/** Starts the Spring e2e backend (4000) and waits until it is healthy (warmed up). */
export const startSpring = async () => {
  const child = start(SPRING_PORT);
  try {
    await waitForHealth(`http://localhost:${SPRING_PORT}/api/v1`, 420_000);
  } catch (err) {
    stop(child);
    throw err;
  }
  return { stop: () => stop(child) };
};
