import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { Button } from './Button.jsx';
import { BUTTON_VARIANTS, buttonClass } from './buttonStyles.js';

describe('Button', () => {
  it('is a type="button" outline button by default', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Retry</Button>);
    const button = screen.getByRole('button', { name: 'Retry' });
    expect(button).toHaveAttribute('type', 'button');
    expect(button.className).toContain('border-ink');
    await userEvent.click(button);
    expect(onClick).toHaveBeenCalled();
  });

  it('shows a spinner, stays labelled and blocks clicks while loading', async () => {
    const onClick = vi.fn();
    const { container } = render(
      <Button variant="plate" loading onClick={onClick}>
        Logging in
      </Button>,
    );
    const button = screen.getByRole('button', { name: 'Logging in' });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
    expect(container.querySelector('.spinner')).toBeInTheDocument();
    await userEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('renders router links and in-page anchors', () => {
    render(
      <MemoryRouter>
        <Button to="/signup" variant="plate">
          Get my topic card
        </Button>
        <Button href="#how">How it works</Button>
      </MemoryRouter>,
    );
    expect(screen.getByRole('link', { name: 'Get my topic card' })).toHaveAttribute('href', '/signup');
    expect(screen.getByRole('link', { name: 'How it works' })).toHaveAttribute('href', '#how');
  });
});

describe('buttonClass', () => {
  it('keeps everything on the plate in Plate Ink, hover included', () => {
    expect(BUTTON_VARIANTS.onPlate).toContain('text-plate-ink');
    expect(BUTTON_VARIANTS.onPlate).toContain('hover:bg-plate-ink');
    expect(BUTTON_VARIANTS.onPlate).toContain('hover:text-plate');
    expect(BUTTON_VARIANTS.onPlate).not.toMatch(/(?<![-\w])text-ink\b/);
  });

  it('never recolours a disabled button on hover', () => {
    Object.values(BUTTON_VARIANTS).forEach((classes) => {
      classes
        .split(' ')
        .filter((name) => name.includes('hover:'))
        .forEach((name) => expect(name.startsWith('not-disabled:')).toBe(true));
    });
  });

  it('falls back to outline for unknown variants and supports wide buttons', () => {
    expect(buttonClass({ variant: 'nope' })).toContain(BUTTON_VARIANTS.outline);
    expect(buttonClass({ wide: true })).toContain('w-full');
  });
});
