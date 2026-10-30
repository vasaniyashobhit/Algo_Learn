import { describe, expect, it, vi } from 'vitest';
import { authStore, TOKEN_STORAGE_KEY } from './authStore.js';

describe('authStore', () => {
  it('stores the token in memory and localStorage, and notifies subscribers', () => {
    const listener = vi.fn();
    const unsubscribe = authStore.subscribe(listener);
    authStore.setToken('abc');
    expect(authStore.getToken()).toBe('abc');
    expect(window.localStorage.getItem(TOKEN_STORAGE_KEY)).toBe('abc');
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
    authStore.clear();
    expect(listener).toHaveBeenCalledTimes(1);
    expect(authStore.getToken()).toBeNull();
    expect(window.localStorage.getItem(TOKEN_STORAGE_KEY)).toBeNull();
  });

  it('expire clears the token and runs the expiry handlers', () => {
    const handler = vi.fn(() => expect(authStore.getToken()).toBeNull());
    const off = authStore.onExpire(handler);
    authStore.setToken('abc');
    authStore.expire();
    expect(handler).toHaveBeenCalledTimes(1);
    off();
    authStore.expire();
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('reload re-reads storage like a fresh page load', () => {
    window.localStorage.setItem(TOKEN_STORAGE_KEY, 'from-disk');
    authStore.reload();
    expect(authStore.getToken()).toBe('from-disk');
  });
});
