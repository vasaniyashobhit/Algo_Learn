import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderWithProviders } from '../../test/renderWithProviders.jsx';
import { AccountMenu } from './AccountMenu.jsx';
import { NavItem } from './NavItem.jsx';
import { PageSkeleton } from './PageSkeleton.jsx';
import { Wordmark } from './Wordmark.jsx';

describe('AccountMenu', () => {
  it('shows a skeleton while the account loads', async () => {
    renderWithProviders(<AccountMenu />, { signedIn: true });
    expect(screen.getByTestId('skeleton')).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'Log out' })).toBeInTheDocument();
  });
});

describe('small layout pieces', () => {
  it('Wordmark always says AlgoLearn', () => {
    renderWithProviders(<Wordmark to="/dashboard" />);
    expect(screen.getByRole('link', { name: 'AlgoLearn' })).toHaveAttribute('href', '/dashboard');
  });

  it('NavItem renders anchors and router links', () => {
    renderWithProviders(
      <nav>
        <NavItem href="/#how">How it works</NavItem>
        <NavItem to="/elsewhere">Elsewhere</NavItem>
      </nav>,
    );
    expect(screen.getByRole('link', { name: 'How it works' })).toHaveAttribute('href', '/#how');
    expect(screen.getByRole('link', { name: 'Elsewhere' })).not.toHaveAttribute('aria-current');
  });

  it('PageSkeleton announces loading', () => {
    renderWithProviders(<PageSkeleton />);
    expect(screen.getByRole('status', { name: 'Loading your account' })).toBeInTheDocument();
    expect(screen.getAllByTestId('skeleton').length).toBeGreaterThan(5);
  });
});
