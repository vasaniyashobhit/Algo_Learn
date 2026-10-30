import { renderHook } from '@testing-library/react';
import { toast } from 'sonner';
import { describe, expect, it, vi } from 'vitest';
import { useRollbackToast } from './useRollbackToast.js';

vi.mock('sonner', () => ({ toast: { error: vi.fn() } }));

describe('useRollbackToast', () => {
  it('titles what was undone and explains why, with a reference only for unexpected errors', () => {
    const { result } = renderHook(() => useRollbackToast());
    result.current('Undone', { code: 'NOT_FOUND', status: 404, requestId: 'r1' }, 'practice');
    expect(toast.error).toHaveBeenLastCalledWith('Undone', { description: "That problem isn't in your practice list any more." });
    result.current('Undone', { code: 'INTERNAL_ERROR', status: 500, requestId: 'r2' });
    expect(toast.error.mock.lastCall[1].description).toMatch(/Reference: r2$/);
    result.current('Undone', { isTimeout: true });
    expect(toast.error.mock.lastCall[1].description).toMatch(/too long/);
  });
});
