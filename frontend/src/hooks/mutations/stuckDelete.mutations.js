import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { deleteStuck } from '../../api/endpoints/stuck.api.js';
import { historyLabel, isHistoryKey, withoutIds } from '../../lib/historyCache.js';
import { queryKeys } from '../../lib/queryKeys.js';
import { UNDO_WINDOW_MS } from '../../lib/undoWindow.js';
import { useRollbackToast } from '../useRollbackToast.js';

const historyFilter = { queryKey: queryKeys.stuck.all, predicate: ({ queryKey }) => isHistoryKey(queryKey) };

/**
 * Delete a stuck query with Undo. The row leaves every cached history page at once and a
 * toast offers Undo; the DELETE is sent when the undo window ends (or when the page unmounts).
 * A failed DELETE puts the row back with a toast; an already-deleted query counts as done.
 */
export const useDeleteStuckWithUndo = ({ undoMs = UNDO_WINDOW_MS } = {}) => {
  const queryClient = useQueryClient();
  const showRollback = useRollbackToast();
  const pending = useRef(new Map());

  // Restore the snapshot, but keep hiding rows whose own delete is still waiting.
  const restore = useCallback(
    (snapshots) => {
      const hidden = new Set(pending.current.keys());
      snapshots.forEach(([key, page]) => queryClient.setQueryData(key, withoutIds(page, hidden)));
    },
    [queryClient],
  );

  const { mutate } = useMutation({
    mutationFn: ({ id }) => deleteStuck(id),
    onSuccess: (_data, { id }) => queryClient.removeQueries({ queryKey: queryKeys.stuck.detail(id) }),
    onError: (error, { snapshots, label }) => {
      if (error?.code === 'STUCK_QUERY_NOT_FOUND') return;
      restore(snapshots);
      showRollback(`Couldn't delete ${label}`, error, 'stuck');
    },
    onSettled: () => queryClient.invalidateQueries(historyFilter),
  });

  const remove = useCallback(
    (item) => {
      const snapshots = queryClient.getQueriesData(historyFilter);
      const label = historyLabel(item);
      const commit = () => {
        pending.current.delete(item.id);
        mutate({ id: item.id, snapshots, label });
      };
      pending.current.set(item.id, { commit, timer: setTimeout(commit, undoMs) });
      snapshots.forEach(([key, page]) => queryClient.setQueryData(key, withoutIds(page, new Set([item.id]))));
      toast(`Deleted ${label}`, {
        duration: undoMs,
        action: {
          label: 'Undo',
          onClick: () => {
            clearTimeout(pending.current.get(item.id)?.timer);
            pending.current.delete(item.id);
            restore(snapshots);
          },
        },
      });
    },
    [queryClient, mutate, restore, undoMs],
  );

  // Leaving the page sends every delete that is still waiting for its undo window.
  useEffect(() => {
    const waiting = pending.current;
    return () =>
      waiting.forEach(({ commit, timer }) => {
        clearTimeout(timer);
        commit();
      });
  }, []);

  return remove;
};
