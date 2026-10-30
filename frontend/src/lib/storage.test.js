import { afterEach, describe, expect, it, vi } from 'vitest';
import { readStorage, removeStorage, writeStorage } from './storage.js';

describe('storage', () => {
  afterEach(() => vi.restoreAllMocks());

  it('reads, writes and removes values', () => {
    expect(writeStorage('k', 'v')).toBe(true);
    expect(readStorage('k')).toBe('v');
    expect(removeStorage('k')).toBe(true);
    expect(readStorage('k')).toBeNull();
  });

  it('never throws when storage is blocked', () => {
    const blocked = () => {
      throw new DOMException('blocked', 'SecurityError');
    };
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(blocked);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(blocked);
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(blocked);
    expect(readStorage('k')).toBeNull();
    expect(writeStorage('k', 'v')).toBe(false);
    expect(removeStorage('k')).toBe(false);
  });
});
