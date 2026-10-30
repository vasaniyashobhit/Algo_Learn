import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Button } from './Button.jsx';
import { Notice } from './Notice.jsx';

describe('Notice', () => {
  it('is a polite status by default', () => {
    render(
      <Notice>
        <p>Your session expired.</p>
      </Notice>,
    );
    expect(screen.getByRole('status')).toHaveTextContent('Your session expired.');
  });

  it('announces errors assertively', () => {
    render(<Notice tone="error">Wrong password</Notice>);
    expect(screen.getByRole('alert')).toHaveTextContent('Wrong password');
  });

  it('draws the plate strap with Plate Ink text and an on-plate action (the fallback strap)', () => {
    render(
      <Notice tone="plate" action={<Button variant="onPlate">Retry AI hints</Button>}>
        <p>AI hints are busy. Try again in a minute.</p>
      </Notice>,
    );
    const strap = screen.getByRole('status');
    expect(strap.className).toContain('bg-plate');
    expect(strap.className).toContain('text-plate-ink');
    const action = screen.getByRole('button', { name: 'Retry AI hints' });
    expect(action.className).toContain('text-plate-ink');
    expect(action.className).toContain('not-disabled:hover:text-plate');
  });

  it('falls back to info for unknown tones', () => {
    render(<Notice tone="weird">x</Notice>);
    expect(screen.getByRole('status').className).toContain('bg-ground');
  });
});
