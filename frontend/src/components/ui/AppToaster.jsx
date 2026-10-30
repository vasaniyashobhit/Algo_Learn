import { Toaster } from 'sonner';
import { useTheme } from '../../hooks/useTheme.js';

/** sonner, themed with the app (styles in styles/effects.css). */
export const AppToaster = () => {
  const { theme } = useTheme();
  return <Toaster theme={theme} position="bottom-right" closeButton duration={6000} />;
};
