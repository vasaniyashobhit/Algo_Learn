// npm run dev: Postgres (Docker), then the Spring Boot backend and the Vite frontend with prefixed logs.
// Works in Windows PowerShell and POSIX shells. Ctrl+C stops both apps (Postgres keeps running).
import { spawn, spawnSync } from 'node:child_process';
import { createInterface } from 'node:readline';
import { isWindows, spawnMvnw } from './mvnw.mjs';

const COLORS = { db: '\x1b[33m', backend: '\x1b[34m', frontend: '\x1b[35m' };
const RESET = '\x1b[0m';

const prefixed = (name, stream) => {
  const lines = createInterface({ input: stream });
  lines.on('line', (line) => process.stdout.write(`${COLORS[name]}[${name}]${RESET} ${line}\n`));
};

const startPostgres = () => {
  console.log(`${COLORS.db}[db]${RESET} docker compose up -d postgres`);
  const result = spawnSync('docker', ['compose', 'up', '-d', '--wait', 'postgres'], { stdio: 'inherit' });
  if (result.status !== 0) {
    console.error('Could not start Postgres. Is Docker Desktop running?');
    process.exit(result.status ?? 1);
  }
};

const run = (name, child) => {
  prefixed(name, child.stdout);
  prefixed(name, child.stderr);
  child.on('exit', (code) => {
    console.log(`${COLORS[name]}[${name}]${RESET} exited with code ${code}`);
    shutdown(code ?? 1);
  });
  return child;
};

const children = [];
let stopping = false;

const shutdown = (code = 0) => {
  if (stopping) return;
  stopping = true;
  children.forEach((child) => {
    if (child.exitCode !== null) return;
    if (isWindows) spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
    else child.kill('SIGINT');
  });
  process.exit(code);
};

startPostgres();
const piped = { stdio: ['ignore', 'pipe', 'pipe'] };
children.push(run('backend', spawnMvnw(['-B', 'spring-boot:run'], piped)));
children.push(run('frontend', spawn('npm', ['run', 'dev', '-w', 'frontend'], { ...piped, shell: isWindows })));
process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));
