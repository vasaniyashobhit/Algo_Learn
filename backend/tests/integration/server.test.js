import { afterEach, describe, expect, it, vi } from 'vitest';
import { EventEmitter } from 'node:events';
import { startServer } from '../../src/server.js';
import { parseEnv } from '../../src/config/env.js';
import { buildEnv } from '../helpers/envFactory.js';
import { createTestApp, silentLogger } from '../helpers/testApp.js';

const fakeLogger = () => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn() });
let running;

afterEach(async () => {
  if (running?.listening) running.close();
});

describe('startServer', () => {
  it('listens on the configured port and serves the API', async () => {
    const env = { ...parseEnv(buildEnv()), PORT: 0 };
    const logger = fakeLogger();
    const { server } = await startServer({ env, logger, app: createTestApp(), proc: new EventEmitter(), exit: vi.fn() });
    running = server;
    const { port } = server.address();
    const res = await fetch(`http://127.0.0.1:${port}/api/v1/health`);
    expect(res.status).toBe(200);
    expect(logger.info).toHaveBeenCalledWith(expect.objectContaining({ port }), 'CP Coach API listening');
  });

  it('builds the app from env when none is injected', async () => {
    const env = { ...parseEnv(buildEnv()), PORT: 0 };
    const { server } = await startServer({ env, logger: silentLogger, proc: new EventEmitter(), exit: vi.fn() });
    running = server;
    const res = await fetch(`http://127.0.0.1:${server.address().port}/api/v1/meta/tags`);
    expect((await res.json()).data.topicTags).toHaveLength(36);
  });

  it('shuts down gracefully on SIGTERM', async () => {
    const proc = new EventEmitter();
    const exit = vi.fn();
    const env = { ...parseEnv(buildEnv()), PORT: 0 };
    const { server } = await startServer({ env, logger: fakeLogger(), app: createTestApp(), proc, exit });
    proc.emit('SIGTERM');
    await vi.waitFor(() => expect(exit).toHaveBeenCalledWith(0));
    expect(server.listening).toBe(false);
  });

  it('rejects when the port is already in use', async () => {
    const env = { ...parseEnv(buildEnv()), PORT: 0 };
    const { server } = await startServer({ env, logger: fakeLogger(), app: createTestApp(), proc: new EventEmitter(), exit: vi.fn() });
    running = server;
    const busy = { ...env, PORT: server.address().port };
    await expect(startServer({ env: busy, logger: fakeLogger(), app: createTestApp(), proc: new EventEmitter() }))
      .rejects.toThrow(/EADDRINUSE/);
  });
});
