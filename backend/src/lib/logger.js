import pino from 'pino';

export const REDACT_PATHS = Object.freeze([
  'req.headers.authorization',
  'req.headers.cookie',
  'req.headers["x-cron-secret"]',
  'res.headers["set-cookie"]',
  '*.password',
  '*.token',
]);

const defaultLevel = () => process.env.LOG_LEVEL ?? (process.env.NODE_ENV === 'test' ? 'silent' : 'info');

/** Creates a JSON pino logger with secrets redacted. */
export const createLogger = ({ level = defaultLevel(), destination } = {}) =>
  pino({ level, redact: { paths: [...REDACT_PATHS], censor: '[redacted]' } }, destination);

export const logger = createLogger();
