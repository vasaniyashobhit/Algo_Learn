import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { authStore } from '../../lib/authStore.js';
import { queryKeys } from '../../lib/queryKeys.js';
import { errorBody, TEST_TOKEN } from '../../test/fixtures.js';
import { server } from '../../test/msw/server.js';
import { renderApp } from '../../test/renderWithProviders.jsx';

const fillAndSubmit = async (email, password) => {
  await userEvent.type(screen.getByLabelText('Email'), email);
  if (password) await userEvent.type(screen.getByLabelText('Password'), password);
  await userEvent.click(screen.getByRole('button', { name: 'Log in' }));
};

const loginFails = (status, body) =>
  server.use(http.post('*/api/v1/auth/login', () => HttpResponse.json(body, { status })));

describe('LoginForm', () => {
  it('validates before sending', async () => {
    renderApp('/login');
    await fillAndSubmit('not-an-email');
    expect(await screen.findByText('Enter a valid email address, like name@example.com')).toBeInTheDocument();
    expect(screen.getByText('Enter your password')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true');
  });

  it('logs in and redirects to the dashboard', async () => {
    const { router } = renderApp('/login');
    await fillAndSubmit('ananya.k@example.in', 'analytical1');
    expect(await screen.findByRole('heading', { name: 'Link your Codeforces handle' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/dashboard');
    expect(authStore.getToken()).toBe(TEST_TOKEN);
  });

  it('returns to the page the user came from', async () => {
    const { router } = renderApp({ pathname: '/login', state: { from: '/somewhere' } });
    await fillAndSubmit('ananya.k@example.in', 'analytical1');
    expect(await screen.findByRole('heading', { name: "That page isn't here" })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/somewhere');
  });

  it('prefetches the dashboard data right after logging in', async () => {
    const { queryClient } = renderApp({ pathname: '/login', state: { from: '/somewhere' } });
    await fillAndSubmit('ananya.k@example.in', 'analytical1');
    // The user went elsewhere, yet the dashboard summary is already cached for later.
    await waitFor(() => expect(queryClient.getQueryData(queryKeys.stats.summary())).toBeDefined());
  });

  it('shows the specific message for wrong credentials', async () => {
    loginFails(401, errorBody('AUTH_INVALID_CREDENTIALS', 'Invalid email or password'));
    renderApp('/login');
    await fillAndSubmit('ananya.k@example.in', 'wrongpass1');
    expect(await screen.findByRole('alert')).toHaveTextContent(
      "That email and password don't match. Check both and try again.",
    );
    expect(authStore.getToken()).toBeNull();
  });

  it('maps VALIDATION_FAILED details onto the fields', async () => {
    loginFails(400, errorBody('VALIDATION_FAILED', 'Request validation failed', [
      { field: 'body.email', message: 'Invalid email address' },
    ]));
    renderApp('/login');
    await fillAndSubmit('a@b.co', 'x');
    expect(await screen.findByText('Invalid email address')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('explains the login rate limit with the wait time', async () => {
    loginFails(429, errorBody('RATE_LIMITED', 'Too many', { retryAfterSeconds: 900 }));
    renderApp('/login');
    await fillAndSubmit('a@b.co', 'x');
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Too many login attempts from this network. Try again in 15 minutes.',
    );
  });

  it('shows a reference for unexpected server errors', async () => {
    loginFails(500, errorBody('INTERNAL_ERROR', 'boom', null, 'req-login'));
    renderApp('/login');
    await fillAndSubmit('a@b.co', 'x');
    expect(await screen.findByText('Reference: req-login')).toBeInTheDocument();
  });
});
