import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { installMatchMedia } from '../../test/matchMedia.js';
import { Pressable } from './Pressable.jsx';

describe('Pressable', () => {
  it('renders a working button with press motion on', async () => {
    const onClick = vi.fn();
    render(<Pressable onClick={onClick}>Sync now</Pressable>);
    const button = screen.getByRole('button', { name: 'Sync now' });
    expect(button).toHaveAttribute('data-motion', 'on');
    await userEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('renders router links', () => {
    render(
      <MemoryRouter>
        <Pressable as="link" to="/login">
          Log in
        </Pressable>
      </MemoryRouter>,
    );
    expect(screen.getByRole('link', { name: 'Log in' })).toHaveAttribute('href', '/login');
  });

  it('turns motion off under reduced motion', () => {
    installMatchMedia({ reducedMotion: true });
    render(
      <MemoryRouter>
        <Pressable>Still</Pressable>
        <Pressable as="link" to="/">
          Home
        </Pressable>
      </MemoryRouter>,
    );
    expect(screen.getByRole('button', { name: 'Still' })).toHaveAttribute('data-motion', 'off');
    expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute('data-motion', 'off');
  });
});
