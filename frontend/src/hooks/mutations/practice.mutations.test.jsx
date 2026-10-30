import { act, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { toast } from 'sonner';
import { describe, expect, it, vi } from 'vitest';
import { practiceItem, problem } from '../../test/dashboardFixtures.js';
import { cachedItem, listIds, renderQueryHook, seedPracticeLists } from '../../test/hookHarness.jsx';
import { respondError, respondOk } from '../../test/msw/scenarios.js';
import { server } from '../../test/msw/server.js';
import { useAddPracticeMutation } from './practice.mutations.js';

vi.mock('sonner', () => ({ toast: { error: vi.fn(), info: vi.fn(), success: vi.fn() } }));

const existing = practiceItem('1/A');
const vars = { problemId: '1950/F2', addedFrom: 'recommendation', problem: problem('1950/F2') };

const setup = () => {
  const harness = renderQueryHook(() => useAddPracticeMutation());
  seedPracticeLists(harness.queryClient, [existing]);
  return harness;
};

describe('useAddPracticeMutation (optimistic)', () => {
  it('shows the item at once, then swaps in the server item', async () => {
    const saved = practiceItem('1950/F2', { id: 'server-id' });
    respondOk('post', '/practice', saved, undefined, { wait: 60 });
    const { result, queryClient } = setup();
    act(() => result.current.mutate(vars));

    await waitFor(() => expect(listIds(queryClient)).toEqual(['1950/F2', '1/A']));
    expect(cachedItem(queryClient, '1950/F2')).toMatchObject({ optimistic: true, status: 'todo' });
    expect(listIds(queryClient, 'todo')).toEqual(['1950/F2', '1/A']);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(cachedItem(queryClient, '1950/F2')).toMatchObject({ id: 'server-id', optimistic: false });
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('rolls back on error with a toast that names the problem and the reason', async () => {
    respondError('post', '/practice', 500, 'INTERNAL_ERROR', null, { wait: 150, requestId: 'req-add' });
    const { result, queryClient } = setup();
    act(() => result.current.mutate(vars));
    await waitFor(() => expect(listIds(queryClient)).toContain('1950/F2'));

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(listIds(queryClient)).toEqual(['1/A']);
    expect(listIds(queryClient, 'todo')).toEqual(['1/A']);
    expect(toast.error).toHaveBeenCalledWith("Couldn't add 1950/F2 to your practice list", {
      description: expect.stringMatching(/on our side.*Reference: req-add$/),
    });
  });

  it('rolls back a network failure with the connection message', async () => {
    server.use(http.post('*/api/v1/practice', () => HttpResponse.error()));
    const { result, queryClient } = setup();
    act(() => result.current.mutate(vars));
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(listIds(queryClient)).toEqual(['1/A']);
    expect(toast.error.mock.lastCall[1].description).toMatch(/connection/i);
  });

  it('treats PRACTICE_ITEM_EXISTS as already done: no rollback toast, a friendly note', async () => {
    respondError('post', '/practice', 409, 'PRACTICE_ITEM_EXISTS', { problemId: '1950/F2' });
    const { result } = setup();
    act(() => result.current.mutate(vars));
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(toast.error).not.toHaveBeenCalled();
    expect(toast.info).toHaveBeenCalledWith('1950/F2 is already in your practice list.');
  });
});
