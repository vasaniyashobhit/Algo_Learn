import { z } from 'zod';
import { validate as validateCron } from 'node-cron';

const LOG_LEVELS = ['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'];

const commaList = z
  .string()
  .transform((value) => value.split(',').map((item) => item.trim()).filter(Boolean))
  .pipe(z.array(z.string()).min(1, 'Provide at least one model'));

const emptyToUndefined = (value) => (value === '' ? undefined : value);

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  MONGODB_URI: z.string().regex(/^mongodb(\+srv)?:\/\//, 'Must be a mongodb:// or mongodb+srv:// URI'),
  JWT_SECRET: z.string().min(32, 'Must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().min(1).default('7d'),
  CLIENT_URL: z.url().default('http://localhost:5173'),
  GEMINI_API_KEY: z.string().min(1),
  GEMINI_MODELS: commaList,
  GROQ_API_KEY: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
  GROQ_MODEL: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
  CRON_SECRET: z.string().min(16, 'Must be at least 16 characters'),
  SYNC_CRON: z.string().min(1).default('0 */6 * * *')
    .refine((expression) => validateCron(expression), 'Must be a valid cron expression'),
  LOG_LEVEL: z.enum(LOG_LEVELS).default('info'),
});

const describeIssue = (issue, source) => {
  const key = issue.path.join('.');
  return source[key] === undefined ? `  - ${key}: missing` : `  - ${key}: ${issue.message}`;
};

export class EnvValidationError extends Error {
  constructor(issues, source) {
    const lines = issues.map((issue) => describeIssue(issue, source));
    super(`Invalid environment configuration (see backend/.env.example):\n${lines.join('\n')}`);
    this.name = 'EnvValidationError';
    this.issues = issues;
  }
}

/** Validates an env-like object and returns a frozen config. Throws on any problem. */
export const parseEnv = (source = process.env) => {
  const result = envSchema.safeParse(source);
  if (!result.success) throw new EnvValidationError(result.error.issues, source);
  return Object.freeze({ ...result.data, isProduction: result.data.NODE_ENV === 'production' });
};

/** CLI scripts (import/sync) only need the DB and log level, not the API secrets. */
export const scriptEnvSchema = envSchema.pick({ NODE_ENV: true, MONGODB_URI: true, LOG_LEVEL: true });

export const parseScriptEnv = (source = process.env) => {
  const result = scriptEnvSchema.safeParse(source);
  if (!result.success) throw new EnvValidationError(result.error.issues, source);
  return Object.freeze(result.data);
};

let cached;

export const getEnv = () => {
  cached ??= parseEnv();
  return cached;
};
