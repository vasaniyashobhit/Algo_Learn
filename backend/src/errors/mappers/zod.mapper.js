import { ZodError } from 'zod';
import { ValidationError } from '../httpErrors.js';
import { codes } from '../codes.js';

/** Converts zod issues to `[{ field, message }]`, optionally prefixed (e.g. `body.email`). */
export const formatZodIssues = (issues, prefix) =>
  issues.map(({ path, message }) => ({
    field: [prefix, ...path].filter((part) => part !== undefined).join('.') || '(root)',
    message,
  }));

export const mapZodError = (err) =>
  err instanceof ZodError
    ? new ValidationError(codes.VALIDATION_FAILED, 'Request validation failed',
      formatZodIssues(err.issues), { cause: err })
    : null;
