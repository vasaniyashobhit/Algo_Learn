import { describe, expect, it } from 'vitest';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

const run = promisify(execFile);
const SERVER = fileURLToPath(new URL('../../src/server.js', import.meta.url));

describe('server.js entry point', () => {
  it('fails fast with exit code 1 and lists missing variables', async () => {
    const env = { PATH: process.env.PATH, SystemRoot: process.env.SystemRoot, NODE_ENV: 'test' };
    const error = await run(process.execPath, [SERVER], { env, timeout: 15_000 }).catch((err) => err);
    expect(error.code).toBe(1);
    expect(error.stderr).toContain('Invalid environment configuration');
    ['MONGODB_URI', 'JWT_SECRET', 'GEMINI_API_KEY', 'GEMINI_MODELS', 'CRON_SECRET']
      .forEach((name) => expect(error.stderr).toContain(`${name}: missing`));
  });
});
