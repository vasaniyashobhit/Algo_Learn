import { describe, expect, it } from 'vitest';
import { sha256Hex } from '../../../src/lib/hash.js';

describe('sha256Hex', () => {
  it('hashes UTF-8 text to 64 hex chars', () => {
    expect(sha256Hex('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
    expect(sha256Hex('é')).toMatch(/^[0-9a-f]{64}$/);
  });
});
