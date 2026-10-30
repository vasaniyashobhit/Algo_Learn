import { QueryClient } from '@tanstack/react-query';

const MAX_RETRIES = 2;

/** Client errors (4xx) will not change on retry; network, timeout and 5xx might. */
export const shouldRetry = (failureCount, error) => {
  const status = error?.status ?? 0;
  if (status >= 400 && status < 500) return false;
  return failureCount < MAX_RETRIES;
};

export const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: shouldRetry,
        staleTime: 30_000,
        refetchOnWindowFocus: false,
      },
      mutations: { retry: false },
    },
  });
