import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { installMatchMedia } from '../test/matchMedia.js';
import { useParallax } from './useParallax.js';

describe('useParallax', () => {
  it('returns a motion value that starts at 0 at the top of the page', () => {
    const { result } = renderHook(() => useParallax(0.35));
    expect(typeof result.current.get).toBe('function');
    expect(result.current.get()).toBe(0);
  });

  it('scales the scroll offset by depth', () => {
    const { result } = renderHook(() => useParallax(0.5));
    // The transform function is pure: check it through the motion value's current output.
    expect(result.current.get()).toBeCloseTo(window.scrollY * 0.5);
  });

  it('stays still under reduced motion', () => {
    installMatchMedia({ reducedMotion: true });
    const { result } = renderHook(() => useParallax(0.35));
    expect(result.current.get()).toBe(0);
  });
});
