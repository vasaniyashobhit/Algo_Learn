import { useIsMutating, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { syncNow } from '../../api/endpoints/users.api.js';
import { getUserMessage } from '../../errors/getUserMessage.js';
import { mutationKeys, queryKeys } from '../../lib/queryKeys.js';
import { useApiErrorToast } from '../useApiErrorToast.js';

/** "Synced. 42 new submissions." plus a note about submissions still being judged. */
export const syncToast = ({ newSubmissions = 0, pending = [] }) => {
  const count = newSubmissions === 1 ? '1 new submission' : `${newSubmissions} new submissions`;
  const title = newSubmissions === 0 ? 'Synced. No new submissions since last time.' : `Synced. ${count}.`;
  const description = pending.length
    ? `${pending.length} still being judged on Codeforces; the next sync picks them up.`
    : undefined;
  return { title, description };
};

/**
 * POST /users/me/sync. The "Syncing…" state is shown at once (useIsSyncing, so it survives
 * remounts); lastSyncedAt is updated from the answer and rolled back on error.
 */
export const useSyncMutation = () => {
  const queryClient = useQueryClient();
  const showError = useApiErrorToast();
  const meKey = queryKeys.auth.me();
  return useMutation({
    mutationKey: mutationKeys.sync,
    mutationFn: syncNow,
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: meKey });
      return { previousUser: queryClient.getQueryData(meKey) };
    },
    onSuccess: (result) => {
      queryClient.setQueryData(meKey, (user) => (user ? { ...user, lastSyncedAt: result.lastSyncedAt } : user));
      const { title, description } = syncToast(result);
      toast.success(title, { description });
    },
    onError: (error, _vars, context) => {
      if (context?.previousUser) queryClient.setQueryData(meKey, context.previousUser);
      // Another sync (e.g. the background job) is running: information, not a failure.
      if (error?.code === 'SYNC_IN_PROGRESS') toast.info(getUserMessage(error, 'sync'));
      else showError(error, 'sync');
    },
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.stats.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.recommendations.all }),
        queryClient.invalidateQueries({ queryKey: meKey }),
      ]),
  });
};

/** true while any sync started from this tab is running. */
export const useIsSyncing = () => useIsMutating({ mutationKey: mutationKeys.sync }) > 0;
