import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { installMatchMedia } from '../../test/matchMedia.js';
import { FadeIn } from './FadeIn.jsx';
import { Wipe } from './Wipe.jsx';

describe('Wipe', () => {
  it('starts clipped from the right and wipes on', () => {
    render(<Wipe data-testid="w">Board</Wipe>);
    const element = screen.getByTestId('w');
    expect(element).toHaveAttribute('data-motion', 'on');
    expect(element.style.clipPath).toMatch(/inset/);
  });

  it('renders the final state at once under reduced motion', () => {
    installMatchMedia({ reducedMotion: true });
    render(
      <Wipe as="section" data-testid="w">
        Board
      </Wipe>,
    );
    const element = screen.getByTestId('w');
    expect(element.tagName).toBe('SECTION');
    expect(element).toHaveAttribute('data-motion', 'off');
    expect(element.style.clipPath).toBe('');
    // No travel, but a short CSS fade keeps new content noticeable.
    expect(element).toHaveClass('reduced-enter');
  });

  it('keeps the caller classes and adds no fade when motion is on', () => {
    render(<Wipe data-testid="w" className="strap">Board</Wipe>);
    expect(screen.getByTestId('w')).toHaveClass('strap');
    expect(screen.getByTestId('w')).not.toHaveClass('reduced-enter');
  });
});

describe('FadeIn', () => {
  it('starts transparent with motion on', () => {
    render(<FadeIn data-testid="f">Hello</FadeIn>);
    expect(screen.getByTestId('f')).toHaveAttribute('data-motion', 'on');
    expect(screen.getByTestId('f').style.opacity).toBe('0');
  });

  it('is fully visible straight away under reduced motion', () => {
    installMatchMedia({ reducedMotion: true });
    render(<FadeIn data-testid="f">Hello</FadeIn>);
    expect(screen.getByTestId('f')).toHaveAttribute('data-motion', 'off');
    expect(screen.getByTestId('f').style.opacity).toBe('');
  });
});
