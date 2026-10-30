import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { RouteFallback } from './RouteFallback.jsx';

describe('RouteFallback', () => {
  it('announces loading and shows the page skeleton inside the page column', () => {
    render(
      <RouteFallback>
        <p>rows</p>
      </RouteFallback>,
    );
    const status = screen.getByRole('status', { name: 'Loading page' });
    expect(status).toHaveClass('wrap');
    expect(status).toHaveTextContent('rows');
  });
});
