import { describe, expect, it } from 'vitest';
import { Writable } from 'node:stream';
import { createLogger, logger, REDACT_PATHS } from '../../../src/lib/logger.js';

const captureStream = () => {
  const lines = [];
  const stream = new Writable({
    write(chunk, _enc, done) {
      lines.push(JSON.parse(chunk.toString()));
      done();
    },
  });
  return { lines, stream };
};

describe('logger', () => {
  it('writes JSON lines at the configured level', () => {
    const { lines, stream } = captureStream();
    const log = createLogger({ level: 'info', destination: stream });
    log.debug('hidden');
    log.info({ requestId: 'r1' }, 'hello');
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatchObject({ msg: 'hello', requestId: 'r1', level: 30 });
  });

  it('redacts auth headers, cookies and secrets', () => {
    const { lines, stream } = captureStream();
    const log = createLogger({ level: 'info', destination: stream });
    log.info({
      req: { headers: { authorization: 'Bearer abc', cookie: 'sid=1', 'x-cron-secret': 's' } },
      body: { password: 'hunter2', token: 't' },
    });
    const text = JSON.stringify(lines[0]);
    ['Bearer abc', 'sid=1', 'hunter2', '"t"'].forEach((secret) => expect(text).not.toContain(secret));
    expect(lines[0].req.headers.authorization).toBe('[redacted]');
    expect(REDACT_PATHS).toContain('req.headers.authorization');
  });

  it('defaults to LOG_LEVEL from the environment (silent in tests)', () => {
    expect(logger.level).toBe('silent');
    expect(createLogger().level).toBe(process.env.LOG_LEVEL);
  });
});
