import { describe, expect, it } from 'vitest';
import { EnvValidationError, parseScriptEnv } from '../../../src/config/env.js';

describe('parseScriptEnv', () => {
  it('needs only MONGODB_URI and applies defaults', () => {
    const env = parseScriptEnv({ MONGODB_URI: 'mongodb+srv://u:p@cluster.test/db' });
    expect(env).toEqual({ NODE_ENV: 'development', MONGODB_URI: 'mongodb+srv://u:p@cluster.test/db', LOG_LEVEL: 'info' });
    expect(Object.isFrozen(env)).toBe(true);
  });

  it('ignores API secrets it does not need', () => {
    expect(() => parseScriptEnv({ MONGODB_URI: 'mongodb://h/db', JWT_SECRET: 'short' })).not.toThrow();
  });

  it('fails with a readable EnvValidationError', () => {
    expect(() => parseScriptEnv({})).toThrow(EnvValidationError);
    expect(() => parseScriptEnv({ MONGODB_URI: 'http://x' })).toThrow('MONGODB_URI: Must be a mongodb');
  });
});
