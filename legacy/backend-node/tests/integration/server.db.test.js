import { afterEach, describe, expect, it, vi } from 'vitest';
import { EventEmitter } from 'node:events';
import mongoose from 'mongoose';
import { startServer } from '../../src/server.js';
import { parseEnv } from '../../src/config/env.js';
import { buildEnv } from '../helpers/envFactory.js';
import { createTestApp, silentLogger } from '../helpers/testApp.js';
import { testDbUri } from '../helpers/db.js';

const testEnv = (overrides = {}) => ({ ...parseEnv(buildEnv(overrides)), PORT: 0 });
const fakeDb = () => ({ connect: vi.fn(async () => {}), disconnect: vi.fn(async () => {}) });
let running;

afterEach(async () => {
  if (running?.listening) running.close();
  await mongoose.disconnect();
});

describe('startServer database wiring', () => {
  it('connects to MONGODB_URI before listening', async () => {
    const db = fakeDb();
    const app = createTestApp();
    const listen = vi.spyOn(app, 'listen');
    const { server } = await startServer({ env: testEnv(), logger: silentLogger, app, proc: new EventEmitter(), db });
    running = server;
    expect(db.connect).toHaveBeenCalledWith('mongodb://localhost:27017/cp-coach-test', { logger: silentLogger });
    expect(db.connect.mock.invocationCallOrder[0]).toBeLessThan(listen.mock.invocationCallOrder[0]);
  });

  it('does not start HTTP when the DB connection fails', async () => {
    const failure = Object.assign(new Error('db down'), { code: 'DB_UNAVAILABLE' });
    const db = { ...fakeDb(), connect: vi.fn().mockRejectedValue(failure) };
    const app = createTestApp();
    const listen = vi.spyOn(app, 'listen');
    await expect(startServer({ env: testEnv(), logger: silentLogger, app, proc: new EventEmitter(), db }))
      .rejects.toBe(failure);
    expect(listen).not.toHaveBeenCalled();
  });

  it('closes the DB again when HTTP fails to start', async () => {
    const first = await startServer({ env: testEnv(), logger: silentLogger, app: createTestApp(), proc: new EventEmitter(), db: fakeDb() });
    running = first.server;
    const db = fakeDb();
    const busy = { ...testEnv(), PORT: first.server.address().port };
    await expect(startServer({ env: busy, logger: silentLogger, app: createTestApp(), proc: new EventEmitter(), db }))
      .rejects.toThrow(/EADDRINUSE/);
    expect(db.disconnect).toHaveBeenCalledWith({ logger: silentLogger });
  });

  it('uses the real connectDB by default and disconnects on SIGTERM', async () => {
    const proc = new EventEmitter();
    const exit = vi.fn();
    const env = testEnv({ MONGODB_URI: testDbUri() });
    const { server } = await startServer({ env, logger: silentLogger, app: createTestApp(), proc, exit });
    expect(mongoose.connection.readyState).toBe(1);
    proc.emit('SIGTERM');
    await vi.waitFor(() => expect(exit).toHaveBeenCalledWith(0));
    expect(server.listening).toBe(false);
    expect(mongoose.connection.readyState).toBe(0);
  });
});
