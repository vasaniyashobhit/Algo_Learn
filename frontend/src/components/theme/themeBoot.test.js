import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { THEME_STORAGE_KEY } from '../../lib/theme.js';
import { installMatchMedia } from '../../test/matchMedia.js';

// The no-flash guarantee: index.html sets data-theme before the app bundle loads.
const html = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8');
const bootScript = html.match(/<script id="theme-boot">([\s\S]*?)<\/script>/)[1];
const runBoot = () => new Function(bootScript)();

describe('index.html theme boot script', () => {
  it('runs in <head>, before the module script', () => {
    expect(html.indexOf('id="theme-boot"')).toBeLessThan(html.indexOf('</head>'));
    expect(html.indexOf('id="theme-boot"')).toBeLessThan(html.indexOf('type="module"'));
  });

  it('uses the same storage key as the app', () => {
    expect(bootScript).toContain(`'${THEME_STORAGE_KEY}'`);
  });

  it('picks dark by default, light from the system, and a saved choice first', () => {
    runBoot();
    expect(document.documentElement.dataset.theme).toBe('dark');
    installMatchMedia({ light: true });
    runBoot();
    expect(document.documentElement.dataset.theme).toBe('light');
    window.localStorage.setItem(THEME_STORAGE_KEY, 'dark');
    runBoot();
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(document.documentElement.style.colorScheme).toBe('dark');
  });

  it('survives blocked storage', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(runBoot).not.toThrow();
    expect(document.documentElement.dataset.theme).toBe('dark');
  });
});
