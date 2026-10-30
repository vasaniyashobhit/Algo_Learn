import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { renderApp } from '../test/renderWithProviders.jsx';

describe('AuthPage', () => {
  it('has AlgoLearn in the title and the practice-only note', () => {
    renderApp('/login');
    expect(document.title).toBe('Log in · AlgoLearn');
    expect(screen.getByText(/Please don't use AlgoLearn during live rated contests/)).toBeInTheDocument();
  });

  it('switches between log in and sign up with links', async () => {
    renderApp('/login');
    const tabs = within(screen.getByRole('navigation', { name: 'Account' }));
    expect(tabs.getByRole('link', { name: 'Log in' })).toHaveAttribute('aria-current', 'page');
    await userEvent.click(tabs.getByRole('link', { name: 'Sign up' }));
    expect(await screen.findByRole('form', { name: 'Sign up' })).toBeInTheDocument();
    expect(document.title).toBe('Sign up · AlgoLearn');
  });

  it('explains an expired session', () => {
    renderApp({ pathname: '/login', state: { reason: 'expired', from: '/dashboard' } });
    expect(screen.getByRole('status')).toHaveTextContent('Your session expired. Log in again');
  });

  it('sends signed-in users on to the dashboard', async () => {
    const { router } = renderApp('/signup', { signedIn: true });
    expect(await screen.findByRole('heading', { name: 'Link your Codeforces handle' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/dashboard');
  });
});
