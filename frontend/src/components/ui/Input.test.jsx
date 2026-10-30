import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef } from 'react';
import { describe, expect, it } from 'vitest';
import { Input } from './Input.jsx';

describe('Input', () => {
  it('is labelled and forwards its ref', async () => {
    const ref = createRef();
    render(<Input label="Email" ref={ref} />);
    const input = screen.getByLabelText('Email');
    expect(ref.current).toBe(input);
    await userEvent.type(input, 'a@b.co');
    expect(input).toHaveValue('a@b.co');
    expect(input).not.toHaveAttribute('aria-invalid');
    expect(input).not.toHaveAttribute('aria-describedby');
  });

  it('links the hint and the error text, and marks the field invalid', () => {
    render(<Input label="Password" id="pw" hint="8+ characters" error="Use at least 8 characters" />);
    const input = screen.getByLabelText('Password');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription('8+ characters Use at least 8 characters');
    expect(screen.getByText('Use at least 8 characters')).toHaveAttribute('id', 'pw-error');
  });
});
