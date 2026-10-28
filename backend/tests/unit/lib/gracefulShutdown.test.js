import { describe, expect, it, vi } from 'vitest';
import { EventEmitter, once } from 'node:events';
import { createServer } from 'node:http';
import { registerGracefulShutdown } from '../../../src/lib/gracefulShutdown.js';

const fakeLogger = () => ({ info: vi.fn(), error: vi.fn() });

const listeningServer = async () => {
  const server = createServer((_req, res) => res.end('ok'));
  server.listen(0);
  await once(server, 'listening');
  return server;
};

describe('registerGracefulShutdown', () => {
  it('registers SIGINT and SIGTERM handlers that shut down once', async () => {
    const proc = new EventEmitter();
    const exit = vi.fn();
    const onClose = vi.fn(async () => {});
    const server = await listeningServer();
    registerGracefulShutdown({ server, logger: fakeLogger(), proc, exit, onClose });
    expect(proc.listenerCount('SIGINT')).toBe(1);
    expect(proc.listenerCount('SIGTERM')).toBe(1);
    proc.emit('SIGTERM');
    await vi.waitFor(() => expect(exit).toHaveBeenCalledWith(0));
    expect(server.listening).toBe(false);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('ignores repeated signals while shutting down', async () => {
    const exit = vi.fn();
    const server = await listeningServer();
    const shutdown = registerGracefulShutdown({ server, logger: fakeLogger(), proc: new EventEmitter(), exit });
    await Promise.all([shutdown('SIGINT'), shutdown('SIGINT')]);
    expect(exit).toHaveBeenCalledTimes(1);
  });

  it('exits with 1 and logs when a close hook fails', async () => {
    const exit = vi.fn();
    const logger = fakeLogger();
    const onClose = async () => { throw new Error('db close failed'); };
    const server = await listeningServer();
    const shutdown = registerGracefulShutdown({ server, logger, proc: new EventEmitter(), exit, onClose });
    await shutdown('SIGTERM');
    expect(exit).toHaveBeenCalledWith(1);
    expect(logger.error).toHaveBeenCalledWith(expect.objectContaining({ err: expect.any(Error) }), 'Error during shutdown');
  });

  it('forces exit(1) when shutdown exceeds the timeout', async () => {
    vi.useFakeTimers();
    const exit = vi.fn();
    const server = { listening: false };
    const onClose = () => new Promise(() => {});
    const shutdown = registerGracefulShutdown({ server, logger: fakeLogger(), proc: new EventEmitter(), exit, onClose, timeoutMs: 1_000 });
    shutdown('SIGTERM');
    await vi.advanceTimersByTimeAsync(1_000);
    expect(exit).toHaveBeenCalledWith(1);
    vi.useRealTimers();
  });
});
