import { z } from 'zod';

// Mirrors backend linkHandleSchema: trimmed, 3–24 characters, letters, digits, _ - and .
export const handleSchema = z.object({
  handle: z
    .string()
    .trim()
    .min(1, 'Enter your Codeforces handle')
    .min(3, 'Codeforces handles have at least 3 characters')
    .max(24, 'Codeforces handles have at most 24 characters')
    .regex(/^[A-Za-z0-9_.-]+$/, 'Use only letters, digits, _ - and . (no spaces or @)'),
});

export const HANDLE_FIELDS = ['handle'];

// Server answers that are about the typed handle, so they belong under the field.
export const HANDLE_FIELD_CODES = ['CF_HANDLE_NOT_FOUND', 'CF_HANDLE_TAKEN'];
