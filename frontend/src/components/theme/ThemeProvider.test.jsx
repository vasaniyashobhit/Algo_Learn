import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { useTheme } from '../../hooks/useTheme.js';
import { THEME_STORAGE_KEY } from '../../lib/theme.js';
import { installMatchMedia, setSystemLight } from '../../test/matchMedia.js';
import { ThemeProvider } from './ThemeProvider.jsx';

const Probe = () => {
  const { theme, toggleTheme, setTheme, isSaved } = useTheme();
  return (
    <>
      <p>
        theme:{theme} saved:{String(isSaved)}
      </p>
      <button type="button" onClick={toggleTheme}>
        toggle
      </button>
      <button type="button" onClick={() => setTheme('purple')}>
        bad
      </button>
    </>
  );
};

const renderProbe = () => render(<ThemeProvider><Probe /></ThemeProvider>);
const html = document.documentElement;

describe('ThemeProvider', () => {
  it('defaults to the system preference (dark)', () => {
    renderProbe();
    expect(screen.getByText('theme:dark saved:false')).toBeInTheDocument();
    expect(html.dataset.theme).toBe('dark');
  });

  it('defaults to light when the system prefers light', () => {
    installMatchMedia({ light: true });
    renderProbe();
    expect(html.dataset.theme).toBe('light');
  });

  it('uses a saved choice over the system preference', () => {
    installMatchMedia({ light: true });
    window.localStorage.setItem(THEME_STORAGE_KEY, 'dark');
    renderProbe();
    expect(screen.getByText('theme:dark saved:true')).toBeInTheDocument();
  });

  it('starts from the theme the boot script already set, so nothing flips on mount', () => {
    html.dataset.theme = 'light';
    renderProbe();
    expect(screen.getByText(/theme:light/)).toBeInTheDocument();
  });

  it('toggling saves the choice and stops following the system', async () => {
    renderProbe();
    await userEvent.click(screen.getByRole('button', { name: 'toggle' }));
    expect(html.dataset.theme).toBe('light');
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('light');
    act(() => setSystemLight(false));
    expect(screen.getByText('theme:light saved:true')).toBeInTheDocument();
  });

  it('follows live system changes while nothing is saved, and ignores bad values', async () => {
    renderProbe();
    act(() => setSystemLight(true));
    expect(html.dataset.theme).toBe('light');
    await userEvent.click(screen.getByRole('button', { name: 'bad' }));
    expect(html.dataset.theme).toBe('light');
  });
});
