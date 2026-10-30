import { QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import { queryKeys } from '../lib/queryKeys.js';
import { createTestQueryClient } from './renderWithProviders.jsx';

/** renderHook inside a fresh QueryClient (no router, no auth). */
export const renderQueryHook = (hook, { queryClient = createTestQueryClient() } = {}) => {
  const wrapper = ({ children }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  return { ...renderHook(hook, { wrapper }), queryClient };
};

/** Seeds the "all" and "todo" practice lists, the way the practice page caches them. */
export const seedPracticeLists = (queryClient, items) => {
  const todo = items.filter((item) => item.status === 'todo');
  queryClient.setQueryData(queryKeys.practice.list(null), { data: items, meta: { total: items.length, status: null } });
  queryClient.setQueryData(queryKeys.practice.list('todo'), { data: todo, meta: { total: todo.length, status: 'todo' } });
};

export const listIds = (queryClient, status = null) =>
  queryClient.getQueryData(queryKeys.practice.list(status))?.data.map((item) => item.problemId);

export const cachedItem = (queryClient, problemId, status = null) =>
  queryClient.getQueryData(queryKeys.practice.list(status))?.data.find((item) => item.problemId === problemId);
