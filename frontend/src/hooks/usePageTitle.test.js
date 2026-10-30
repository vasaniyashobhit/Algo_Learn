import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { formatTitle, usePageTitle } from './usePageTitle.js';

describe('usePageTitle', () => {
  it('puts AlgoLearn in every title', () => {
    renderHook(() => usePageTitle('Log in'));
    expect(document.title).toBe('Log in · AlgoLearn');
    expect(formatTitle()).toBe('AlgoLearn');
  });
});
