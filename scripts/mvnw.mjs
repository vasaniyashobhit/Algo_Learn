// Runs the backend Maven wrapper with the given arguments: mvnw.cmd on Windows, ./mvnw elsewhere.
// Usage: node scripts/mvnw.mjs verify   (exits with Maven's exit code)
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

export const backendDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'backend');
export const isWindows = process.platform === 'win32';

/** Spawns the wrapper in backend/. On Windows a .cmd file needs a shell. */
export const spawnMvnw = (args, options = {}) =>
  spawn(isWindows ? `"${join(backendDir, 'mvnw.cmd')}"` : './mvnw', args, {
    cwd: backendDir,
    shell: isWindows,
    stdio: 'inherit',
    ...options,
  });

const isEntryPoint = Boolean(process.argv[1]) && fileURLToPath(import.meta.url) === resolve(process.argv[1]);

if (isEntryPoint) {
  const child = spawnMvnw(['-B', ...process.argv.slice(2)]);
  child.on('exit', (code) => process.exit(code ?? 1));
}
