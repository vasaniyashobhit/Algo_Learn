import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { linkHandle, unlinkHandle } from '../../api/endpoints/users.api.js';
import { queryKeys } from '../../lib/queryKeys.js';
import { useApiErrorToast } from '../useApiErrorToast.js';

/** The user changed: cache the new user and refetch everything computed from the handle. */
const useUserChanged = () => {
  const queryClient = useQueryClient();
  return async (user) => {
    queryClient.setQueryData(queryKeys.auth.me(), user);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.stats.all }),
      queryClient.invalidateQueries({ queryKey: queryKeys.recommendations.all }),
    ]);
  };
};

/** PUT /users/me/handle. Errors are shown inline by the handle form, not as toasts. */
export const useLinkHandleMutation = () => {
  const userChanged = useUserChanged();
  return useMutation({ mutationFn: linkHandle, onSuccess: userChanged });
};

/** DELETE /users/me/handle (the confirm dialog comes first). */
export const useUnlinkHandleMutation = () => {
  const userChanged = useUserChanged();
  const showError = useApiErrorToast();
  return useMutation({
    mutationFn: unlinkHandle,
    onSuccess: async (user) => {
      await userChanged(user);
      toast.success('Handle unlinked. Your synced submissions and topic stats were removed.');
    },
    onError: (error) => showError(error, 'unlinkHandle'),
  });
};
