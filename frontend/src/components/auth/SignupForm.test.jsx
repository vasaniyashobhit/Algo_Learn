import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { authStore } from '../../lib/authStore.js';
import { errorBody } from '../../test/fixtures.js';
import { server } from '../../test/msw/server.js';
import { renderApp } from '../../test/renderWithProviders.jsx';

const fill = async ({ name = 'Ravi Kumar', email = 'ravi@example.in', password = 'practice42' } = {}) => {
  if (name) await userEvent.type(screen.getByLabelText('Name'), name);
  if (email) await userEvent.type(screen.getByLabelText('Email'), email);
  if (password) await userEvent.type(screen.getByLabelText('Password'), password);
  await userEvent.click(screen.getByRole('button', { name: 'Create account' }));
};

const signupFails = (status, body) =>
  server.use(http.post('*/api/v1/auth/signup', () => HttpResponse.json(body, { status })));

describe('SignupForm', () => {
  it('applies the same password rules as the backend', async () => {
    renderApp('/signup');
    await fill({ password: 'onlyletters' });
    expect(await screen.findByText('Include at least one digit')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toHaveAccessibleDescription(
      '8+ characters, with at least one letter and one digit. Include at least one digit',
    );
  });

  it('creates the account and opens the dashboard', async () => {
    const { router } = renderApp('/signup');
    await fill();
    expect(await screen.findByRole('heading', { name: 'Link your Codeforces handle' })).toBeInTheDocument();
    expect(within(screen.getByRole('main')).getByText(/Welcome, Ravi./)).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/dashboard');
    expect(authStore.getToken()).not.toBeNull();
  });

  it('puts AUTH_EMAIL_TAKEN on the email field with a way forward', async () => {
    signupFails(409, errorBody('AUTH_EMAIL_TAKEN', 'An account with this email already exists'));
    renderApp('/signup');
    await fill();
    expect(
      await screen.findByText('An account with this email already exists. Log in instead, or use another email.'),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true');
  });

  it('shows every server validation detail inline', async () => {
    signupFails(400, errorBody('VALIDATION_FAILED', 'Request validation failed', [
      { field: 'body.name', message: 'Name must be at least 2 characters' },
      { field: 'body.password', message: 'Password must be at most 72 bytes' },
    ]));
    renderApp('/signup');
    await fill();
    expect(await screen.findByText('Name must be at least 2 characters')).toBeInTheDocument();
    expect(screen.getByText('Password must be at most 72 bytes')).toBeInTheDocument();
  });

  it('explains a network failure', async () => {
    server.use(http.post('*/api/v1/auth/signup', () => HttpResponse.error()));
    renderApp('/signup');
    await fill();
    expect(await screen.findByRole('alert')).toHaveTextContent(/Check your internet connection/);
  });
});
