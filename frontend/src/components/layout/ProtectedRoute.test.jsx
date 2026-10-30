import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { errorBody, testUser } from '../../test/fixtures.js';
import { server } from '../../test/msw/server.js';
import { renderApp } from '../../test/renderWithProviders.jsx';

describe('ProtectedRoute', () => {
  it('sends anonymous visitors to /login and remembers where they were going', async () => {
    const { router } = renderApp('/dashboard');
    expect(await screen.findByRole('form', { name: 'Log in' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/login');
    expect(router.state.location.state).toEqual({ from: '/dashboard' });
  });

  it('shows a page skeleton while /auth/me loads, then the page', async () => {
    renderApp('/dashboard', { signedIn: true });
    expect(screen.getByRole('status', { name: 'Loading your account' })).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'Dashboard' })).toBeInTheDocument();
    expect(screen.getByText(testUser.email, { exact: false })).toBeInTheDocument();
  });

  it('shows a recoverable error when the account cannot load', async () => {
    let calls = 0;
    server.use(
      http.get('*/api/v1/auth/me', () => {
        calls += 1;
        return calls === 1
          ? HttpResponse.json(errorBody('INTERNAL_ERROR', 'boom', null, 'req-me'), { status: 500 })
          : HttpResponse.json({ success: true, data: testUser });
      }),
    );
    renderApp('/dashboard', { signedIn: true });
    expect(await screen.findByRole('heading', { name: "We couldn't load your account" })).toBeInTheDocument();
    expect(screen.getByText('req-me')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('heading', { name: 'Dashboard' })).toBeInTheDocument();
  });

  it('logs out and asks to log in again when the token has expired', async () => {
    server.use(
      http.get('*/api/v1/auth/me', () => HttpResponse.json(errorBody('AUTH_TOKEN_EXPIRED', 'expired'), { status: 401 })),
    );
    const { router } = renderApp('/dashboard', { signedIn: true });
    expect(await screen.findByRole('form', { name: 'Log in' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/login');
  });
});
