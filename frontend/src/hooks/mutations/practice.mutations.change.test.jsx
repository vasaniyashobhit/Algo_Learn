import { act, waitFor } from '@testing-library/react';
import { toast } from 'sonner';
import { describe, expect, it, vi } from 'vitest';
import { practiceItem } from '../../test/dashboardFixtures.js';
import { cachedItem, listIds, renderQueryHook, seedPracticeLists } from '../../test/hookHarness.jsx';
import { respondError, respondOk } from '../../test/msw/scenarios.js';
import { useRemovePracticeMutation, useUpdatePracticeMutation } from './practice.mutations.js';

vi.mock('sonner', () => ({ toast: { error: vi.fn(), info: vi.fn(), success: vi.fn() } }));

const items = [practiceItem('1/A'), practiceItem('2/B')];

const setup = (hook) => {
  const harness = renderQueryHook(hook);
  seedPracticeLists(harness.queryClient, items);
  return harness;
};

describe('useUpdatePracticeMutation (optimistic)', () => {
  it('moves the item at once: changed in "all", gone from "todo"', async () => {
    respondOk('patch', '/practice/1/A', { ...items[0], status: 'solved', updatedAt: 'later' }, undefined, { wait: 60 });
    const { result, queryClient } = setup(() => useUpdatePracticeMutation());
    act(() => result.current.mutate({ problemId: '1/A', status: 'solved' }));

    await waitFor(() => expect(cachedItem(queryClient, '1/A').status).toBe('solved'));
    expect(listIds(queryClient, 'todo')).toEqual(['2/B']);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(cachedItem(queryClient, '1/A').updatedAt).toBe('later');
  });

  it('rolls back with a specific toast when the change fails', async () => {
    respondError('patch', '/practice/1/A', 404, 'NOT_FOUND', null, { wait: 150 });
    const { result, queryClient } = setup(() => useUpdatePracticeMutation());
    act(() => result.current.mutate({ problemId: '1/A', status: 'skipped' }));
    await waitFor(() => expect(cachedItem(queryClient, '1/A').status).toBe('skipped'));

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(cachedItem(queryClient, '1/A').status).toBe('todo');
    expect(listIds(queryClient, 'todo')).toEqual(['1/A', '2/B']);
    expect(toast.error).toHaveBeenCalledWith("Couldn't mark 1/A as skipped", {
      description: "That problem isn't in your practice list any more.",
    });
  });
});

describe('useRemovePracticeMutation (optimistic)', () => {
  it('removes the item from every list at once', async () => {
    respondOk('delete', '/practice/2/B', items[1], undefined, { wait: 60 });
    const { result, queryClient } = setup(() => useRemovePracticeMutation());
    act(() => result.current.mutate({ problemId: '2/B' }));
    await waitFor(() => expect(listIds(queryClient)).toEqual(['1/A']));
    expect(listIds(queryClient, 'todo')).toEqual(['1/A']);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it('rolls back with a toast when the server refuses', async () => {
    respondError('delete', '/practice/2/B', 503, 'DB_UNAVAILABLE', null, { wait: 30 });
    const { result, queryClient } = setup(() => useRemovePracticeMutation());
    act(() => result.current.mutate({ problemId: '2/B' }));
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(listIds(queryClient)).toEqual(['1/A', '2/B']);
    expect(toast.error.mock.lastCall[0]).toBe("Couldn't remove 2/B from your practice list");
  });

  it('counts 404 NOT_FOUND as already removed (no rollback, no toast)', async () => {
    respondError('delete', '/practice/2/B', 404, 'NOT_FOUND');
    const { result, queryClient } = setup(() => useRemovePracticeMutation());
    act(() => result.current.mutate({ problemId: '2/B' }));
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(listIds(queryClient)).toEqual(['1/A']);
    expect(toast.error).not.toHaveBeenCalled();
  });
});
