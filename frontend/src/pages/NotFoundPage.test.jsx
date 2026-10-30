import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderApp } from '../test/renderWithProviders.jsx';

describe('NotFoundPage', () => {
  it('offers the way back to the start for visitors', () => {
    renderApp('/no/such/page');
    expect(screen.getByRole('heading', { name: "That page isn't here" })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Go to the start' })).toHaveAttribute('href', '/');
    expect(document.title).toBe('Page not found · AlgoLearn');
  });

  it('offers the dashboard to signed-in users', async () => {
    renderApp('/no/such/page', { signedIn: true });
    expect(await screen.findByRole('link', { name: 'Go to your dashboard' })).toHaveAttribute('href', '/dashboard');
  });
});
