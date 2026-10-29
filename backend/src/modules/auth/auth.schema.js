import { z } from 'zod';

// bcrypt only uses the first 72 bytes of a password, so longer ones are rejected.
export const PASSWORD_MAX_BYTES = 72;

export const emailField = z
  .string({ error: 'Email is required' })
  .trim()
  .toLowerCase()
  .pipe(z.email('Invalid email address').max(254, 'Email is too long'));

export const passwordField = z
  .string({ error: 'Password is required' })
  .min(8, 'Password must be at least 8 characters')
  .refine((value) => /[A-Za-z]/.test(value), 'Password must contain at least one letter')
  .refine((value) => /\d/.test(value), 'Password must contain at least one digit')
  .refine((value) => Buffer.byteLength(value) <= PASSWORD_MAX_BYTES,
    `Password must be at most ${PASSWORD_MAX_BYTES} bytes`);

export const nameField = z
  .string({ error: 'Name is required' })
  .trim()
  .min(2, 'Name must be at least 2 characters')
  .max(50, 'Name must be at most 50 characters');

export const signupSchema = z.object({ email: emailField, password: passwordField, name: nameField });

// Login does not repeat the signup rules: a wrong password is just wrong credentials.
export const loginSchema = z.object({
  email: emailField,
  password: z
    .string({ error: 'Password is required' })
    .min(1, 'Password is required')
    .max(256, 'Password is too long'),
});
