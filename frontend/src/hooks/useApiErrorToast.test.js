import { renderHook } from '@testing-library/react';
import { toast } from 'sonner';
import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '../errors/ApiError.js';
import { useApiErrorToast } from './useApiErrorToast.js';

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

describe('useApiErrorToast', () => {
  it('shows the user-specific message without a reference for expected errors', () => {
    const { result } = renderHook(() => useApiErrorToast());
    const error = new ApiError({ status: 409, code: 'CF_HANDLE_TAKEN', requestId: 'r-1' });
    result.current(error, 'linkHandle', { handle: 'ananya_k' });
    expect(toast.error).toHaveBeenCalledWith('"ananya_k" is already linked to another AlgoLearn account.', {
      description: undefined,
    });
  });

  it('adds the request id for unexpected errors', () => {
    const { result } = renderHook(() => useApiErrorToast());
    result.current(new ApiError({ status: 500, code: 'INTERNAL_ERROR', requestId: 'r-500' }));
    expect(toast.error).toHaveBeenLastCalledWith(expect.stringMatching(/on our side/), {
      description: 'Reference: r-500',
    });
  });
});
