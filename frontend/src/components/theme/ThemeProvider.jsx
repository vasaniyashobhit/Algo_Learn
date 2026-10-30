import { useCallback, useEffect, useMemo, useState } from 'react';
import { applyTheme, isTheme, otherTheme, readSavedTheme, resolveTheme, saveTheme, systemQuery } from '../../lib/theme.js';
import { ThemeContext } from './ThemeContext.js';

// index.html already set data-theme before paint; start from it so React never disagrees.
const initialTheme = () => {
  const fromDom = document.documentElement.dataset.theme;
  return isTheme(fromDom) ? fromDom : resolveTheme();
};

export const ThemeProvider = ({ children }) => {
  const [theme, setThemeState] = useState(initialTheme);
  const [isSaved, setIsSaved] = useState(() => readSavedTheme() !== null);

  useEffect(() => applyTheme(theme), [theme]);

  // Without a saved choice, follow the system preference live.
  useEffect(() => {
    if (isSaved) return undefined;
    const query = systemQuery();
    const onChange = (event) => setThemeState(event.matches ? 'light' : 'dark');
    query?.addEventListener?.('change', onChange);
    return () => query?.removeEventListener?.('change', onChange);
  }, [isSaved]);

  const setTheme = useCallback((next) => {
    if (!isTheme(next)) return;
    setThemeState(next);
    setIsSaved(saveTheme(next));
  }, []);

  const toggleTheme = useCallback(() => setTheme(otherTheme(theme)), [setTheme, theme]);

  const value = useMemo(() => ({ theme, setTheme, toggleTheme, isSaved }), [theme, setTheme, toggleTheme, isSaved]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};
