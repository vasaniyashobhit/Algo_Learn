import { describe, expect, it } from 'vitest';
import { loginSchema, signupSchema } from './authSchemas.js';

const issues = (schema, value) => schema.safeParse(value).error?.issues.map((issue) => issue.message) ?? [];

describe('signupSchema (mirrors the backend rules)', () => {
  const valid = { name: 'Ananya K', email: '  Ananya.K@Example.in ', password: 'analytical1' };

  it('accepts a valid sign-up and normalises the email', () => {
    expect(signupSchema.parse(valid).email).toBe('ananya.k@example.in');
  });

  it('requires a name of 2–50 characters', () => {
    expect(issues(signupSchema, { ...valid, name: ' a ' })).toContain('Your name needs at least 2 characters');
    expect(issues(signupSchema, { ...valid, name: 'x'.repeat(51) })).toContain('Keep your name to 50 characters or fewer');
  });

  it('checks the password length, letter, digit and byte limit', () => {
    expect(issues(signupSchema, { ...valid, password: 'a1' })).toContain('Use at least 8 characters');
    expect(issues(signupSchema, { ...valid, password: '12345678' })).toContain('Include at least one letter');
    expect(issues(signupSchema, { ...valid, password: 'abcdefgh' })).toContain('Include at least one digit');
    expect(issues(signupSchema, { ...valid, password: `a1${'é'.repeat(36)}` })).toContain(
      'That password is too long (72 bytes at most)',
    );
  });

  it('rejects a bad email', () => {
    expect(issues(signupSchema, { ...valid, email: 'not-an-email' })).toContain(
      'Enter a valid email address, like name@example.com',
    );
    expect(issues(signupSchema, { ...valid, email: '' })).toContain('Enter your email address');
  });
});

describe('loginSchema', () => {
  it('only needs an email and a non-empty password', () => {
    expect(loginSchema.safeParse({ email: 'a@b.co', password: 'x' }).success).toBe(true);
    expect(issues(loginSchema, { email: 'a@b.co', password: '' })).toContain('Enter your password');
  });
});
