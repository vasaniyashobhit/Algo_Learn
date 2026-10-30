import { z } from 'zod';

// Mirrors backend/src/modules/auth/auth.schema.js so most mistakes are caught before sending.
export const PASSWORD_MAX_BYTES = 72;

const byteLength = (value) => new TextEncoder().encode(value).length;

const emailField = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, 'Enter your email address')
  .pipe(z.email('Enter a valid email address, like name@example.com').max(254, 'That email is too long'));

export const signupSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Your name needs at least 2 characters')
    .max(50, 'Keep your name to 50 characters or fewer'),
  email: emailField,
  password: z
    .string()
    .min(8, 'Use at least 8 characters')
    .refine((value) => /[A-Za-z]/.test(value), 'Include at least one letter')
    .refine((value) => /\d/.test(value), 'Include at least one digit')
    .refine((value) => byteLength(value) <= PASSWORD_MAX_BYTES, 'That password is too long (72 bytes at most)'),
});

// Login does not repeat the signup rules: a wrong password is just wrong credentials.
export const loginSchema = z.object({
  email: emailField,
  password: z.string().min(1, 'Enter your password').max(256, 'That password is too long'),
});

export const SIGNUP_FIELDS = ['name', 'email', 'password'];
export const LOGIN_FIELDS = ['email', 'password'];
