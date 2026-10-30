import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { authStore } from '../../lib/authStore.js';
import { testUser } from '../../test/fixtures.js';
import { renderApp } from '../../test/renderWithProviders.jsx';

describe('Navbar (score bug)', () => {
  it('shows the wordmark, landing anchors, theme toggle and log in when signed out', () => {
    renderApp('/');
    const header = screen.getByRole('banner');
    expect(within(header).getByRole('link', { name: 'AlgoLearn' })).toHaveAttribute('href', '/');
    expect(within(header).getByRole('link', { name: 'How it works' })).toHaveAttribute('href', '/#how');
    expect(within(header).getByRole('button', { name: /Theme: Dark/ })).toBeInTheDocument();
    expect(within(header).getByRole('link', { name: 'Log in' })).toHaveAttribute('href', '/login');
  });

  it('shows the user name and marks the current page when signed in', async () => {
    renderApp('/dashboard', { signedIn: true });
    const header = screen.getByRole('banner');
    expect(await within(header).findByText(testUser.name)).toBeInTheDocument();
    expect(within(header).getByRole('link', { name: 'Dashboard' })).toHaveAttribute('aria-current', 'page');
    expect(within(header).getByRole('link', { name: 'AlgoLearn' })).toHaveAttribute('href', '/dashboard');
  });

  it('logs out back to the landing page', async () => {
    const { router } = renderApp('/dashboard', { signedIn: true });
    await userEvent.click(await screen.findByRole('button', { name: 'Log out' }));
    expect(authStore.getToken()).toBeNull();
    expect(router.state.location.pathname).toBe('/');
    expect(await screen.findByText("You're logged out.")).toBeInTheDocument();
    expect(within(screen.getByRole('banner')).getByRole('link', { name: 'Log in' })).toBeInTheDocument();
  });

  it('has a skip link to the main content', () => {
    renderApp('/');
    expect(screen.getByRole('link', { name: 'Skip to content' })).toHaveAttribute('href', '#main');
    expect(screen.getByRole('main')).toHaveAttribute('id', 'main');
  });
});
