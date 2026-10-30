import { QueryClientProvider } from '@tanstack/react-query';
import { MotionConfig } from 'motion/react';
import { useState } from 'react';
import { AuthProvider } from './components/auth/AuthProvider.jsx';
import { ErrorBoundary } from './components/layout/ErrorBoundary.jsx';
import { AppToaster } from './components/ui/AppToaster.jsx';
import { ThemeProvider } from './components/theme/ThemeProvider.jsx';
import { createQueryClient } from './lib/queryClient.js';

/** Every provider the app needs, around whatever router is passed in as children. */
export const AppProviders = ({ children, queryClient }) => {
  const [client] = useState(() => queryClient ?? createQueryClient());
  return (
    <ErrorBoundary>
      <QueryClientProvider client={client}>
        <ThemeProvider>
          <MotionConfig reducedMotion="user">
            <AuthProvider>
              {children}
              <AppToaster />
            </AuthProvider>
          </MotionConfig>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};
