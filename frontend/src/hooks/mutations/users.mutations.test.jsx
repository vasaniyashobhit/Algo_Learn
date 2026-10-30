import { act, waitFor } from '@testing-library/react';
import { toast } from 'sonner';
import { describe, expect, it, vi } from 'vitest';
import { queryKeys } from '../../lib/queryKeys.js';
import { linkedUser } from '../../test/dashboardFixtures.js';
import { testUser } from '../../test/fixtures.js';
import { renderQueryHook } from '../../test/hookHarness.jsx';
import { respondError } from '../../test/msw/scenarios.js';
import { useLinkHandleMutation, useUnlinkHandleMutation } from './users.mutations.js';

vi.mock('sonner', () => ({ toast: { error: vi.fn(), info: vi.fn(), success: vi.fn() } }));

const seed = (queryClient, user) => {
  queryClient.setQueryData(queryKeys.auth.me(), user);
  queryClient.setQueryData(queryKeys.stats.summary(), { data: {}, meta: {} });
};

describe('useLinkHandleMutation', () => {
  it('caches the linked user and refreshes the stats', async () => {
    const { result, queryClient } = renderQueryHook(() => useLinkHandleMutation());
    seed(queryClient, testUser);
    await act(() => result.current.mutateAsync('ananya_k'));
    expect(queryClient.getQueryData(queryKeys.auth.me()).cfHandle).toBe('ananya_k');
    expect(queryClient.getQueryState(queryKeys.stats.summary()).isInvalidated).toBe(true);
    expect(toast.error).not.toHaveBeenCalled();
  });
});

describe('useUnlinkHandleMutation', () => {
  it('confirms with a toast that says what was removed', async () => {
    const { result, queryClient } = renderQueryHook(() => useUnlinkHandleMutation());
    seed(queryClient, linkedUser);
    act(() => result.current.mutate());
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(queryClient.getQueryData(queryKeys.auth.me()).cfHandle).toBeNull();
    expect(toast.success).toHaveBeenCalledWith(
      'Handle unlinked. Your synced submissions and topic stats were removed.',
    );
  });

  it('refuses while a sync runs, with its own message', async () => {
    respondError('delete', '/users/me/handle', 409, 'SYNC_IN_PROGRESS');
    const { result, queryClient } = renderQueryHook(() => useUnlinkHandleMutation());
    seed(queryClient, linkedUser);
    act(() => result.current.mutate());
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(toast.error).toHaveBeenCalledWith(
      'A sync of your account is running. Try again when it finishes, in about a minute.',
      { description: undefined },
    );
    expect(queryClient.getQueryData(queryKeys.auth.me()).cfHandle).toBe('ananya_k');
  });
});
