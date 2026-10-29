import { z } from 'zod';
import { nameField } from '../auth/auth.schema.js';
import { CF_HANDLE_PATTERN } from './user.model.js';

// Strict: only the name can be changed here (email/password/cfHandle have their own flows).
export const updateMeSchema = z.strictObject({ name: nameField });

export const linkHandleSchema = z.strictObject({
  handle: z.string({ error: 'Handle is required' })
    .trim()
    .regex(CF_HANDLE_PATTERN, 'Handle must be 3-24 characters: letters, digits, _ - .'),
});
