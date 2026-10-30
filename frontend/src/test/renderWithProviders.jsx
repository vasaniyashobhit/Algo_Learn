import { QueryClient } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { AppProviders } from '../App.jsx';
import { authStore } from '../lib/authStore.js';
import { routes as appRoutes } from '../routes.jsx';
import { TEST_TOKEN } from './fixtures.js';

export const createTestQueryClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false } } });

/**
 * Renders `ui` (or the real app routes when `ui` is omitted) inside every provider with a
 * memory router. Options: route ('/'), path for ui ('*'), extraRoutes, signedIn, queryClient.
 */
export const renderWithProviders = (ui, options = {}) => {
  const { route = '/', path = '*', extraRoutes = [], signedIn = false, queryClient = createTestQueryClient() } = options;
  if (signedIn) authStore.setToken(TEST_TOKEN);
  const routes = ui ? [{ path, element: ui }, ...extraRoutes] : appRoutes;
  // `route` is a path or a location object such as { pathname, state }.
  const router = createMemoryRouter(routes, { initialEntries: [route] });
  const result = render(
    <AppProviders queryClient={queryClient}>
      <RouterProvider router={router} />
    </AppProviders>,
  );
  return { ...result, router, queryClient };
};

/** The full app at a given address. */
export const renderApp = (route = '/', options = {}) => renderWithProviders(null, { ...options, route });
