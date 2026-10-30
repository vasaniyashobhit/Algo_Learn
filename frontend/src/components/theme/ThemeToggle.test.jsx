import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { THEME_STORAGE_KEY } from '../../lib/theme.js';
import { installMatchMedia } from '../../test/matchMedia.js';
import { ThemeProvider } from './ThemeProvider.jsx';
import { ThemeToggle } from './ThemeToggle.jsx';

const renderToggle = () =>
  render(
    <ThemeProvider>
      <ThemeToggle />
    </ThemeProvider>,
  );

describe('ThemeToggle', () => {
  it('names the current theme and what it switches to', () => {
    renderToggle();
    const button = screen.getByRole('button', { name: 'Theme: Dark. Switch to light theme' });
    expect(button).toHaveTextContent('Dark');
  });

  it('switches theme, saves it and relabels itself', async () => {
    renderToggle();
    await userEvent.click(screen.getByRole('button', { name: /Switch to light/ }));
    expect(document.documentElement.dataset.theme).toBe('light');
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('light');
    expect(await screen.findByRole('button', { name: 'Theme: Light. Switch to dark theme' })).toBeInTheDocument();
  });

  it('switches instantly under reduced motion', async () => {
    installMatchMedia({ reducedMotion: true });
    renderToggle();
    await userEvent.click(screen.getByRole('button', { name: /Switch to light/ }));
    expect(await screen.findByText('Light')).toBeInTheDocument();
  });
});
