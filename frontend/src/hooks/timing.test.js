import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useFlash } from './useFlash.js';
import { useNow } from './useNow.js';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('useNow', () => {
  it('ticks on its interval and stops on unmount', () => {
    vi.setSystemTime(new Date('2026-10-30T12:00:00Z'));
    const { result, unmount } = renderHook(() => useNow(1000));
    const start = result.current;
    act(() => vi.advanceTimersByTime(1000));
    expect(result.current).toBe(start + 1000);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe('useFlash', () => {
  it('turns on when triggered and off after the delay, restarting on a second trigger', () => {
    const { result } = renderHook(() => useFlash(500));
    expect(result.current[0]).toBe(false);
    act(() => result.current[1]());
    expect(result.current[0]).toBe(true);
    act(() => vi.advanceTimersByTime(400));
    act(() => result.current[1]());
    act(() => vi.advanceTimersByTime(400));
    expect(result.current[0]).toBe(true);
    act(() => vi.advanceTimersByTime(100));
    expect(result.current[0]).toBe(false);
  });
});
