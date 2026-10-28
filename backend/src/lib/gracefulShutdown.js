import { once } from 'node:events';

export const SHUTDOWN_SIGNALS = Object.freeze(['SIGINT', 'SIGTERM']);

/**
 * Closes the HTTP server (and any extra `onClose` hooks, e.g. the DB) on SIGINT/SIGTERM.
 * Forces exit(1) if shutdown takes longer than `timeoutMs`. Returns the shutdown function.
 */
export const registerGracefulShutdown = ({
  server,
  logger,
  onClose = async () => {},
  proc = process,
  exit = (code) => process.exit(code),
  timeoutMs = 10_000,
}) => {
  let shuttingDown = false;

  const shutdown = async (signal) => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info({ signal }, 'Shutting down gracefully');
    const timer = setTimeout(() => {
      logger.error({ timeoutMs }, 'Shutdown timed out, forcing exit');
      exit(1);
    }, timeoutMs);
    timer.unref?.();
    try {
      if (server.listening) {
        const closed = once(server, 'close');
        server.close();
        server.closeIdleConnections?.();
        await closed;
      }
      await onClose();
      logger.info('Shutdown complete');
      exit(0);
    } catch (err) {
      logger.error({ err }, 'Error during shutdown');
      exit(1);
    } finally {
      clearTimeout(timer);
    }
  };

  SHUTDOWN_SIGNALS.forEach((signal) => proc.once(signal, () => shutdown(signal)));
  return shutdown;
};
