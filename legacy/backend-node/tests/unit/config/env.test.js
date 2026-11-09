import { describe, expect, it } from 'vitest';
import { EnvValidationError, getEnv, parseEnv } from '../../../src/config/env.js';
import { buildEnv } from '../../helpers/envFactory.js';

describe('parseEnv', () => {
  it('parses a valid env, applies defaults and coerces types', () => {
    const env = parseEnv(buildEnv({ PORT: '5000' }));
    expect(env.PORT).toBe(5000);
    expect(env.GEMINI_MODELS).toEqual(['gemini-a', 'gemini-b']);
    expect(env.SYNC_CRON).toBe('0 */6 * * *');
    expect(env.LOG_LEVEL).toBe('info');
    expect(env.isProduction).toBe(false);
    expect(Object.isFrozen(env)).toBe(true);
  });

  it('treats empty optional Groq vars as unset', () => {
    const env = parseEnv(buildEnv({ GROQ_API_KEY: '', GROQ_MODEL: '' }));
    expect(env.GROQ_API_KEY).toBeUndefined();
    expect(env.GROQ_MODEL).toBeUndefined();
  });

  it('drops a trailing slash from CLIENT_URL so CORS matches the Origin header', () => {
    expect(parseEnv(buildEnv({ CLIENT_URL: 'https://algolearn.vercel.app/' })).CLIENT_URL).toBe('https://algolearn.vercel.app');
    expect(parseEnv(buildEnv({ CLIENT_URL: 'https://algolearn.vercel.app' })).CLIENT_URL).toBe('https://algolearn.vercel.app');
  });

  it('flags production mode', () => {
    expect(parseEnv(buildEnv({ NODE_ENV: 'production' })).isProduction).toBe(true);
  });

  it('fails fast listing every missing variable', () => {
    const source = buildEnv();
    delete source.MONGODB_URI;
    delete source.GEMINI_API_KEY;
    expect(() => parseEnv(source)).toThrow(EnvValidationError);
    try {
      parseEnv(source);
    } catch (err) {
      expect(err.message).toContain('MONGODB_URI: missing');
      expect(err.message).toContain('GEMINI_API_KEY: missing');
      expect(err.issues).toHaveLength(2);
    }
  });

  it('explains invalid values that are present', () => {
    const source = buildEnv({ JWT_SECRET: 'short', MONGODB_URI: 'http://nope', PORT: 'abc' });
    expect(() => parseEnv(source)).toThrow(/JWT_SECRET: Must be at least 32 characters/);
    expect(() => parseEnv(source)).toThrow(/MONGODB_URI: Must be a mongodb/);
    expect(() => parseEnv(source)).toThrow(/PORT:/);
  });

  it('rejects an empty model list and unknown log levels', () => {
    expect(() => parseEnv(buildEnv({ GEMINI_MODELS: ' , ' }))).toThrow(/GEMINI_MODELS/);
    expect(() => parseEnv(buildEnv({ LOG_LEVEL: 'loud' }))).toThrow(/LOG_LEVEL/);
  });
});

describe('getEnv', () => {
  it('reads process.env once and caches the result', () => {
    Object.assign(process.env, buildEnv());
    const first = getEnv();
    expect(getEnv()).toBe(first);
    expect(first.NODE_ENV).toBe('test');
  });
});
