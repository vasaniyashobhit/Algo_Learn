import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { THEME_STORAGE_KEY } from '../lib/theme.js';
import { installMatchMedia } from '../test/matchMedia.js';
import { renderApp } from '../test/renderWithProviders.jsx';

const expectLanding = () => {
  expect(screen.getByRole('heading', { level: 1, name: 'Your weakest topic, up on the board.' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Get my topic card' })).toHaveAttribute('href', '/signup');
  expect(screen.getByRole('heading', { name: 'How it works' })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'What you get' })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Practice and upsolving only' })).toBeInTheDocument();
};

describe.each(['dark', 'light'])('LandingPage in the %s theme', (theme) => {
  it('renders every section with the theme applied', () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    renderApp('/');
    expectLanding();
    expect(document.documentElement.dataset.theme).toBe(theme);
    const label = theme === 'dark' ? 'Dark' : 'Light';
    expect(screen.getByRole('button', { name: new RegExp(`Theme: ${label}`) })).toBeInTheDocument();
  });
});

describe('LandingPage content', () => {
  it('labels the scoreboard in plain words and as a real table', () => {
    renderApp('/');
    const board = screen.getByRole('table', { name: 'Topic strength' });
    expect(screen.getByText('Scoreboard · sample data')).toBeInTheDocument();
    expect(within(board).getAllByRole('row')).toHaveLength(5);
    expect(within(board).getByRole('rowheader', { name: /Bitmasks \+ DP/ })).toHaveTextContent('Weak');
    expect(within(board).getByRole('columnheader', { name: 'Strength (0–1)' })).toBeInTheDocument();
  });

  it('has exactly one plate action, the parallax planes and an AlgoLearn title', () => {
    const { container } = renderApp('/');
    expect(container.querySelectorAll('main .bg-plate')).toHaveLength(1);
    expect(container.querySelectorAll('[data-depth]')).toHaveLength(2);
    expect(document.title).toBe('Your Codeforces topic coach · AlgoLearn');
    expect(screen.getByText(/independent tool that uses public Codeforces data/)).toBeInTheDocument();
  });

  it('freezes every plane under reduced motion', () => {
    installMatchMedia({ reducedMotion: true });
    const { container } = renderApp('/');
    container.querySelectorAll('[data-depth]').forEach((layer) => expect(layer).toHaveAttribute('data-motion', 'off'));
  });

  it('never calls the product CP Coach', () => {
    const { container } = renderApp('/');
    expect(container.textContent).not.toMatch(/cp coach/i);
    expect(container.textContent).toMatch(/AlgoLearn/);
  });
});
