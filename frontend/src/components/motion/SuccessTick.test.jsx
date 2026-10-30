import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { installMatchMedia } from '../../test/matchMedia.js';
import { SuccessTick } from './SuccessTick.jsx';

describe('SuccessTick', () => {
  it('draws itself in, hidden from screen readers', () => {
    render(<SuccessTick />);
    const tick = screen.getByTestId('success-tick');
    expect(tick).toHaveAttribute('data-motion', 'on');
    expect(tick).toHaveAttribute('aria-hidden', 'true');
  });

  it('is a plain tick under reduced motion', () => {
    installMatchMedia({ reducedMotion: true });
    render(<SuccessTick className="extra" />);
    const tick = screen.getByTestId('success-tick');
    expect(tick).toHaveAttribute('data-motion', 'off');
    expect(tick).toHaveClass('extra');
  });
});
