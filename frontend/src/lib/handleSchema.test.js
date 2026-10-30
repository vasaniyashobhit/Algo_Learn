import { describe, expect, it } from 'vitest';
import { handleSchema } from './handleSchema.js';

const errorFor = (handle) => handleSchema.safeParse({ handle }).error?.issues[0]?.message ?? null;

describe('handleSchema (mirrors the backend rules)', () => {
  it('accepts real handle shapes and trims them', () => {
    expect(handleSchema.parse({ handle: '  tourist ' })).toEqual({ handle: 'tourist' });
    expect(errorFor('ananya_k')).toBeNull();
    expect(errorFor('a.b-c')).toBeNull();
  });

  it.each([
    ['', 'Enter your Codeforces handle'],
    ['ab', 'Codeforces handles have at least 3 characters'],
    ['x'.repeat(25), 'Codeforces handles have at most 24 characters'],
    ['ananya k', 'Use only letters, digits, _ - and . (no spaces or @)'],
    ['@ananya', 'Use only letters, digits, _ - and . (no spaces or @)'],
  ])('%j → %s', (handle, message) => expect(errorFor(handle)).toBe(message));
});
