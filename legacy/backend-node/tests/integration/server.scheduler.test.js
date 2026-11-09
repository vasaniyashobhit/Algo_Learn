import { afterEach, describe, expect, it, vi } from 'vitest';
import { EventEmitter } from 'node:events';
import { startServer } from '../../src/server.js';
import { parseEnv } from '../../src/config/env.js';
import { buildEnv } from '../helpers/envFactory.js';
import { silentLogger } from '../helpers/testApp.js';
import { fakeCfClient } from '../helpers/codeforces.js';
import { createServices } from '../../src/services.js';

const db = { connect: async () => {}, disconnect: vi.fn(async () => {}) };
let running;

afterEach(async () => {
  if (running?.listening) running.close();
});

const start = (overrides) => startServer({
  env: { ...parseEnv(buildEnv()), PORT: 0 },
  logger: silentLogger,
  proc: new EventEmitter(),
  exit: vi.fn(),
  db,
  services: createServices({ client: fakeCfClient() }),
  ...overrides,
});

describe('startServer and the scheduler', () => {
  it('does not start cron jobs when NODE_ENV=test', async () => {
    const { server, cron } = await start();
    running = server;
    expect(cron.tasks).toEqual([]);
  });

  it('starts the scheduler with the shared jobs and stops it before closing the DB', async () => {
    const stop = vi.fn(async () => {});
    const scheduler = vi.fn(() => ({ tasks: [], stop }));
    const proc = new EventEmitter();
    const exit = vi.fn();
    const services = createServices({ client: fakeCfClient() });
    await start({ scheduler, proc, exit, services });
    expect(scheduler).toHaveBeenCalledWith(expect.objectContaining({ jobs: services.jobs }));
    proc.emit('SIGTERM');
    await vi.waitFor(() => expect(exit).toHaveBeenCalledWith(0));
    expect(stop).toHaveBeenCalledOnce();
    expect(db.disconnect).toHaveBeenCalled();
  });

  it('serves the internal trigger with CRON_SECRET from env', async () => {
    const { server } = await start();
    running = server;
    const url = `http://127.0.0.1:${server.address().port}/api/v1/internal/sync-all`;
    const res = await fetch(url, { method: 'POST', headers: { 'x-cron-secret': 'c'.repeat(16) } });
    expect(res.status).toBe(202);
  });
});
