import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../errors/ApiError.js';
import { ErrorBoundary } from './ErrorBoundary.jsx';
import { RouteError } from './RouteError.jsx';

let shouldThrow = true;
const Bomb = () => {
  if (shouldThrow) throw new ApiError({ status: 500, code: 'INTERNAL_ERROR', requestId: 'req-crash' });
  return <p>Recovered</p>;
};

const inRouter = (element) => (
  <RouterProvider router={createMemoryRouter([{ path: '*', element, errorElement: <RouteError /> }])} />
);

describe('ErrorBoundary', () => {
  it('shows the recovery screen with the request id, and can retry', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    shouldThrow = true;
    render(inRouter(<ErrorBoundary><Bomb /></ErrorBoundary>));
    expect(screen.getByRole('heading', { name: 'This screen hit a problem' })).toBeInTheDocument();
    expect(screen.getByText('req-crash')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Go to the start' })).toHaveAttribute('href', '/');
    shouldThrow = false;
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(screen.getByText('Recovered')).toBeInTheDocument();
    expect(console.error).toHaveBeenCalled();
  });

  it('renders children when nothing throws', () => {
    shouldThrow = false;
    render(inRouter(<ErrorBoundary><Bomb /></ErrorBoundary>));
    expect(screen.getByText('Recovered')).toBeInTheDocument();
  });
});

describe('RouteError', () => {
  it('turns a thrown render error into the recovery screen', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    shouldThrow = true;
    render(inRouter(<Bomb />));
    expect(screen.getByRole('heading', { name: 'This screen hit a problem' })).toBeInTheDocument();
  });

  it('shows the not-found page for a 404 response', async () => {
    const loader = () => {
      throw new Response('missing', { status: 404 });
    };
    const router = createMemoryRouter([{ path: '*', loader, element: <p>never</p>, errorElement: <RouteError /> }]);
    const { AppProviders } = await import('../../App.jsx');
    render(
      <AppProviders>
        <RouterProvider router={router} />
      </AppProviders>,
    );
    expect(await screen.findByRole('heading', { name: "That page isn't here" })).toBeInTheDocument();
  });
});
