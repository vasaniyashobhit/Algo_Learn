import { z } from 'zod';
import { nameField } from '../auth/auth.schema.js';

// Strict: only the name can be changed here (email/password/cfHandle have their own flows).
export const updateMeSchema = z.strictObject({ name: nameField });
