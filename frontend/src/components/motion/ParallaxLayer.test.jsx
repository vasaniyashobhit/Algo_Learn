import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { installMatchMedia } from '../../test/matchMedia.js';
import { ParallaxLayer } from './ParallaxLayer.jsx';

describe('ParallaxLayer', () => {
  it('records its depth and moves with transform only', () => {
    render(
      <ParallaxLayer depth={0.35} data-testid="layer">
        beams
      </ParallaxLayer>,
    );
    const layer = screen.getByTestId('layer');
    expect(layer).toHaveAttribute('data-depth', '0.35');
    expect(layer).toHaveAttribute('data-motion', 'on');
    expect(layer.style.top).toBe('');
  });

  it('is still under reduced motion', () => {
    installMatchMedia({ reducedMotion: true });
    render(
      <ParallaxLayer depth={0.12} data-testid="layer">
        board
      </ParallaxLayer>,
    );
    const layer = screen.getByTestId('layer');
    expect(layer).toHaveAttribute('data-motion', 'off');
    expect(layer.style.transform).toMatch(/^(none|)$/);
  });
});
