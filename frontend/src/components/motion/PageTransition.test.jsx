import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { installMatchMedia } from '../../test/matchMedia.js';
import { PageTransition } from './PageTransition.jsx';

const renderAt = (path) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <PageTransition className="page">
        <p>Content</p>
      </PageTransition>
    </MemoryRouter>,
  );

describe('PageTransition', () => {
  it('wipes the page in on route changes', () => {
    renderAt('/login');
    const wrapper = screen.getByText('Content').parentElement;
    expect(wrapper).toHaveAttribute('data-motion', 'on');
    expect(wrapper).toHaveClass('page');
    expect(wrapper.style.opacity).toBe('0');
  });

  it('is a plain wrapper under reduced motion', () => {
    installMatchMedia({ reducedMotion: true });
    renderAt('/login');
    const wrapper = screen.getByText('Content').parentElement;
    expect(wrapper).toHaveAttribute('data-motion', 'off');
    expect(wrapper.style.opacity).toBe('');
  });
});
