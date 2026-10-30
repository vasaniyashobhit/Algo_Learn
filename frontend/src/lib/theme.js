import { readStorage, writeStorage } from './storage.js';

// Keep in sync with the inline boot script in index.html.
export const THEME_STORAGE_KEY = 'algolearn-theme';
export const THEMES = ['dark', 'light'];
const LIGHT_QUERY = '(prefers-color-scheme: light)';

export const isTheme = (value) => THEMES.includes(value);

export const readSavedTheme = () => {
  const saved = readStorage(THEME_STORAGE_KEY);
  return isTheme(saved) ? saved : null;
};

export const saveTheme = (theme) => writeStorage(THEME_STORAGE_KEY, theme);

export const systemQuery = () => window.matchMedia?.(LIGHT_QUERY) ?? null;

export const systemTheme = () => (systemQuery()?.matches ? 'light' : 'dark');

/** Saved choice first, then the system preference, then dark. */
export const resolveTheme = () => readSavedTheme() ?? systemTheme();

export const applyTheme = (theme) => {
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.style.colorScheme = theme;
};

export const otherTheme = (theme) => (theme === 'dark' ? 'light' : 'dark');
