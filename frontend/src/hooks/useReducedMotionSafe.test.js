import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { installMatchMedia, setReducedMotion } from '../test/matchMedia.js';
import { useReducedMotionSafe } from './useReducedMotionSafe.js';

describe('useReducedMotionSafe', () => {
  it('is false by default', () => {
    const { result } = renderHook(() => useReducedMotionSafe());
    expect(result.current).toBe(false);
  });

  it('is true when the user prefers reduced motion', () => {
    installMatchMedia({ reducedMotion: true });
    const { result } = renderHook(() => useReducedMotionSafe());
    expect(result.current).toBe(true);
  });

  it('updates live when the setting changes', () => {
    const { result } = renderHook(() => useReducedMotionSafe());
    act(() => setReducedMotion(true));
    expect(result.current).toBe(true);
  });

  it('is false without matchMedia', () => {
    const original = window.matchMedia;
    window.matchMedia = undefined;
    const { result } = renderHook(() => useReducedMotionSafe());
    expect(result.current).toBe(false);
    window.matchMedia = original;
  });
});
