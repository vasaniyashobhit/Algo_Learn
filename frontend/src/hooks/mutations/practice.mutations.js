import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { addPractice, removePractice, updatePractice } from '../../api/endpoints/practice.api.js';
import { findItem, optimisticItem, removeItem, STATUS_LABELS, upsertItem } from '../../lib/practiceCache.js';
import { useRollbackToast } from '../useRollbackToast.js';
import { usePracticeCache } from './practiceOptimistic.js';

/** POST /practice, optimistic. PRACTICE_ITEM_EXISTS is not a failure: the problem is already there. */
export const useAddPracticeMutation = () => {
  const cache = usePracticeCache();
  const showRollback = useRollbackToast();
  return useMutation({
    mutationFn: addPractice,
    onMutate: async (vars) => {
      const snapshots = await cache.snapshot();
      cache.apply((list, status) => upsertItem(list, optimisticItem(vars), status));
      return { snapshots };
    },
    onSuccess: (item) => cache.apply((list, status) => upsertItem(list, { ...item, optimistic: false }, status)),
    onError: (error, { problemId }, context) => {
      if (error?.code === 'PRACTICE_ITEM_EXISTS') {
        toast.info(`${problemId} is already in your practice list.`);
        return;
      }
      cache.rollback(context?.snapshots);
      showRollback(`Couldn't add ${problemId} to your practice list`, error, 'practice');
    },
    onSettled: cache.settle,
  });
};

/** PATCH /practice/:id with { status }, optimistic. */
export const useUpdatePracticeMutation = () => {
  const cache = usePracticeCache();
  const showRollback = useRollbackToast();
  return useMutation({
    mutationFn: updatePractice,
    onMutate: async ({ problemId, status }) => {
      const snapshots = await cache.snapshot();
      const current = findItem(snapshots, problemId);
      if (current) cache.apply((list, filter) => upsertItem(list, { ...current, status }, filter));
      return { snapshots };
    },
    onSuccess: (item) => cache.apply((list, filter) => upsertItem(list, item, filter)),
    onError: (error, { problemId, status }, context) => {
      cache.rollback(context?.snapshots);
      showRollback(`Couldn't mark ${problemId} as ${STATUS_LABELS[status].toLowerCase()}`, error, 'practice');
    },
    onSettled: cache.settle,
  });
};

/** DELETE /practice/:id, optimistic. A 404 NOT_FOUND means it is already gone, so it counts as done. */
export const useRemovePracticeMutation = () => {
  const cache = usePracticeCache();
  const showRollback = useRollbackToast();
  return useMutation({
    mutationFn: removePractice,
    onMutate: async ({ problemId }) => {
      const snapshots = await cache.snapshot();
      cache.apply((list) => removeItem(list, problemId));
      return { snapshots };
    },
    onError: (error, { problemId }, context) => {
      if (error?.code === 'NOT_FOUND') return;
      cache.rollback(context?.snapshots);
      showRollback(`Couldn't remove ${problemId} from your practice list`, error, 'practice');
    },
    onSettled: cache.settle,
  });
};
