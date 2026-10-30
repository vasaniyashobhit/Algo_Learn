import { act, waitFor } from '@testing-library/react';
import { toast } from 'sonner';
import { describe, expect, it, vi } from 'vitest';
import { queryKeys } from '../../lib/queryKeys.js';
import { linkedUser } from '../../test/dashboardFixtures.js';
import { renderQueryHook } from '../../test/hookHarness.jsx';
import { respondError, respondOk } from '../../test/msw/scenarios.js';
import { syncToast, useIsSyncing, useSyncMutation } from './sync.mutations.js';

vi.mock('sonner', () => ({ toast: { error: vi.fn(), info: vi.fn(), success: vi.fn() } }));

const setup = () => {
  const harness = renderQueryHook(() => ({ sync: useSyncMutation(), syncing: useIsSyncing() }));
  const { queryClient } = harness;
  queryClient.setQueryData(queryKeys.auth.me(), linkedUser);
  queryClient.setQueryData(queryKeys.stats.summary(), { data: {}, meta: {} });
  queryClient.setQueryData(queryKeys.recommendations.all, { data: { topics: [] }, meta: {} });
  return harness;
};

describe('syncToast', () => {
  it('counts new submissions and mentions ones still judging', () => {
    expect(syncToast({ newSubmissions: 42 })).toEqual({ title: 'Synced. 42 new submissions.', description: undefined });
    expect(syncToast({ newSubmissions: 1 }).title).toBe('Synced. 1 new submission.');
    expect(syncToast({ newSubmissions: 0 }).title).toBe('Synced. No new submissions since last time.');
    expect(syncToast({ newSubmissions: 2, pending: [{}, {}] }).description).toBe(
      '2 still being judged on Codeforces; the next sync picks them up.',
    );
  });
});

describe('useSyncMutation', () => {
  it('is "syncing" while pending, then updates lastSyncedAt, toasts and invalidates', async () => {
    const at = '2026-10-30T11:59:00.000Z';
    respondOk('post', '/users/me/sync', { newSubmissions: 7, totalSubmissions: 9, lastSyncedAt: at, pending: [] }, undefined, {
      wait: 80,
    });
    const { result, queryClient } = setup();
    act(() => result.current.sync.mutate());
    await waitFor(() => expect(result.current.syncing).toBe(true));
    await waitFor(() => expect(result.current.syncing).toBe(false));

    expect(queryClient.getQueryData(queryKeys.auth.me()).lastSyncedAt).toBe(at);
    expect(toast.success).toHaveBeenCalledWith('Synced. 7 new submissions.', { description: undefined });
    expect(queryClient.getQueryState(queryKeys.stats.summary()).isInvalidated).toBe(true);
    expect(queryClient.getQueryState(queryKeys.recommendations.all).isInvalidated).toBe(true);
  });

  it('shows SYNC_IN_PROGRESS as information and keeps the old sync time', async () => {
    respondError('post', '/users/me/sync', 409, 'SYNC_IN_PROGRESS');
    const { result, queryClient } = setup();
    act(() => result.current.sync.mutate());
    await waitFor(() => expect(result.current.sync.isError).toBe(true));
    expect(toast.info).toHaveBeenCalledWith('A sync is already running. Your numbers will update when it finishes.');
    expect(toast.error).not.toHaveBeenCalled();
    expect(queryClient.getQueryData(queryKeys.auth.me()).lastSyncedAt).toBe(linkedUser.lastSyncedAt);
  });

  it('explains the 20 s cooldown with the wait', async () => {
    respondError('post', '/users/me/sync', 429, 'RATE_LIMITED', { retryAfterSeconds: 12 });
    const { result } = setup();
    act(() => result.current.sync.mutate());
    await waitFor(() => expect(result.current.sync.isError).toBe(true));
    expect(toast.error).toHaveBeenCalledWith('You synced moments ago. Try again in 12 seconds.', { description: undefined });
  });

  it('says the saved data is still shown when Codeforces is down', async () => {
    respondError('post', '/users/me/sync', 503, 'CF_UNAVAILABLE');
    const { result } = setup();
    act(() => result.current.sync.mutate());
    await waitFor(() => expect(result.current.sync.isError).toBe(true));
    expect(toast.error.mock.lastCall[0]).toBe(
      "Codeforces isn't responding, so we couldn't sync. Your last synced data is still shown.",
    );
  });
});
