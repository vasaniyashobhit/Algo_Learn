import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { installMatchMedia } from '../../test/matchMedia.js';
import { CountUp } from './CountUp.jsx';

describe('CountUp', () => {
  it('counts up to the value and tells screen readers the final value only', async () => {
    const { container } = render(<CountUp value={1487} duration={0.05} />);
    expect(container.firstChild).toHaveAttribute('data-motion', 'on');
    expect(container.querySelector('.sr-only')).toHaveTextContent('1487');
    const visible = container.querySelector('[aria-hidden="true"]');
    await screen.findByText('1487', { selector: '[aria-hidden="true"]' }, { timeout: 2000 });
    expect(visible).toHaveTextContent('1487');
  });

  it('shows the final value immediately under reduced motion', () => {
    installMatchMedia({ reducedMotion: true });
    const { container } = render(<CountUp value={0.29} format={(value) => value.toFixed(2)} />);
    expect(container.firstChild).toHaveAttribute('data-motion', 'off');
    expect(container.querySelector('[aria-hidden="true"]')).toHaveTextContent('0.29');
  });
});
