import { describe, expect, it } from 'vitest';
import { loginSchema, signupSchema } from '../../../../src/modules/auth/auth.schema.js';

const valid = { email: 'Coder@Example.com ', password: 'secret123', name: '  Ada  ' };
const messages = (schema, input) => schema.safeParse(input).error?.issues.map((i) => i.message) ?? [];

describe('signupSchema', () => {
  it('trims and lowercases the email and trims the name', () => {
    expect(signupSchema.parse(valid)).toEqual({ email: 'coder@example.com', password: 'secret123', name: 'Ada' });
  });

  it('strips unknown keys', () => {
    expect(signupSchema.parse({ ...valid, role: 'admin' })).not.toHaveProperty('role');
  });

  it('rejects an invalid email', () => {
    expect(messages(signupSchema, { ...valid, email: 'not-an-email' })).toEqual(['Invalid email address']);
  });

  it.each([
    ['short1', 'Password must be at least 8 characters'],
    ['12345678', 'Password must contain at least one letter'],
    ['abcdefgh', 'Password must contain at least one digit'],
    [`a1${'x'.repeat(71)}`, 'Password must be at most 72 bytes'],
    [`a1${'é'.repeat(36)}`, 'Password must be at most 72 bytes'],
  ])('rejects password %j', (password, message) => {
    expect(messages(signupSchema, { ...valid, password })).toContain(message);
  });

  it('accepts a 72-byte password with a letter and a digit', () => {
    expect(signupSchema.safeParse({ ...valid, password: `a1${'x'.repeat(70)}` }).success).toBe(true);
  });

  it.each([
    ['A', 'Name must be at least 2 characters'],
    ['   B  ', 'Name must be at least 2 characters'],
    ['n'.repeat(51), 'Name must be at most 50 characters'],
  ])('rejects name %j', (name, message) => {
    expect(messages(signupSchema, { ...valid, name })).toEqual([message]);
  });

  it('accepts names of exactly 2 and 50 characters', () => {
    expect(signupSchema.safeParse({ ...valid, name: 'Al' }).success).toBe(true);
    expect(signupSchema.safeParse({ ...valid, name: 'n'.repeat(50) }).success).toBe(true);
  });

  it('reports every missing field', () => {
    const issues = signupSchema.safeParse({}).error.issues;
    expect(issues.map((i) => [i.path[0], i.message])).toEqual([
      ['email', 'Email is required'],
      ['password', 'Password is required'],
      ['name', 'Name is required'],
    ]);
  });
});

describe('loginSchema', () => {
  it('normalizes the email and keeps the password as given', () => {
    expect(loginSchema.parse({ email: ' A@B.co ', password: ' x ' })).toEqual({ email: 'a@b.co', password: ' x ' });
  });

  it('does not apply the signup password rules', () => {
    expect(loginSchema.safeParse({ email: 'a@b.co', password: 'short' }).success).toBe(true);
  });

  it('requires a non-empty password of sane length', () => {
    expect(messages(loginSchema, { email: 'a@b.co', password: '' })).toEqual(['Password is required']);
    expect(messages(loginSchema, { email: 'a@b.co', password: 'x'.repeat(257) })).toEqual(['Password is too long']);
  });
});
