import { envSchema } from '../../src/config/env.js';

// Prints only variable names and OK/missing/invalid, never values.
const rows = Object.entries(envSchema.shape).map(([name, schema]) => {
  const raw = process.env[name];
  const result = schema.safeParse(raw);
  const status = raw === undefined ? (result.success ? 'OK (default)' : 'MISSING') : result.success ? 'OK' : `INVALID: ${result.error.issues[0].message}`;
  return { name, status };
});
console.table(rows);
process.exitCode = rows.some((r) => !r.status.startsWith('OK')) ? 1 : 0;
