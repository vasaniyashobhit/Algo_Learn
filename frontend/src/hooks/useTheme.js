import { useContext } from 'react';
import { ThemeContext } from '../components/theme/ThemeContext.js';

export const useTheme = () => {
  const value = useContext(ThemeContext);
  if (!value) throw new Error('useTheme must be used inside <ThemeProvider>');
  return value;
};
