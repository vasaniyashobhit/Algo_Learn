import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useAuth } from './useAuth.js';
import { useTheme } from './useTheme.js';

describe('context hooks outside their providers', () => {
  it('useTheme explains what is missing', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => useTheme())).toThrow('useTheme must be used inside <ThemeProvider>');
  });

  it('useAuth explains what is missing', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => useAuth())).toThrow('useAuth must be used inside <AuthProvider>');
  });
});
