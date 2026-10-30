import { describe, expect, it } from 'vitest';
import { installMatchMedia } from '../test/matchMedia.js';
import {
  applyTheme,
  isTheme,
  otherTheme,
  readSavedTheme,
  resolveTheme,
  saveTheme,
  systemTheme,
  THEME_STORAGE_KEY,
} from './theme.js';

describe('theme helpers', () => {
  it('defaults to dark when the system has no light preference', () => {
    expect(systemTheme()).toBe('dark');
    expect(resolveTheme()).toBe('dark');
  });

  it('follows a light system preference', () => {
    installMatchMedia({ light: true });
    expect(resolveTheme()).toBe('light');
  });

  it('prefers a saved choice over the system', () => {
    installMatchMedia({ light: true });
    saveTheme('dark');
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
    expect(resolveTheme()).toBe('dark');
  });

  it('ignores garbage in storage', () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, 'neon');
    expect(readSavedTheme()).toBeNull();
  });

  it('falls back to dark without matchMedia', () => {
    const original = window.matchMedia;
    window.matchMedia = undefined;
    expect(systemTheme()).toBe('dark');
    window.matchMedia = original;
  });

  it('applies the theme to <html> and flips themes', () => {
    applyTheme('light');
    expect(document.documentElement.dataset.theme).toBe('light');
    expect(document.documentElement.style.colorScheme).toBe('light');
    expect(otherTheme('light')).toBe('dark');
    expect(otherTheme('dark')).toBe('light');
    expect(isTheme('dark')).toBe(true);
    expect(isTheme('blue')).toBe(false);
  });
});
