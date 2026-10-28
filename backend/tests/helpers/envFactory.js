/** A complete, valid env object. Override or delete keys per test. */
export const buildEnv = (overrides = {}) => ({
  NODE_ENV: 'test',
  PORT: '4000',
  MONGODB_URI: 'mongodb://localhost:27017/cp-coach-test',
  JWT_SECRET: 'x'.repeat(32),
  JWT_EXPIRES_IN: '7d',
  CLIENT_URL: 'http://localhost:5173',
  GEMINI_API_KEY: 'test-gemini-key',
  GEMINI_MODELS: 'gemini-a, gemini-b',
  CRON_SECRET: 'c'.repeat(16),
  ...overrides,
});
