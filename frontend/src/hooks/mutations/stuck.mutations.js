import { useMutation, useQueryClient } from '@tanstack/react-query';
import { submitStuck } from '../../api/endpoints/stuck.api.js';
import { buildStuckForm } from '../../lib/stuckInput.js';
import { queryKeys } from '../../lib/queryKeys.js';

/**
 * POST /stuck with { inputType, text | url | file }. The answer seeds GET /stuck/:id so the
 * result page renders at once, and the history is marked stale.
 */
export const useSubmitStuckMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input) => submitStuck(buildStuckForm(input)),
    onSuccess: (result) => {
      queryClient.setQueryData(queryKeys.stuck.detail(result.id), result);
      return queryClient.invalidateQueries({ queryKey: queryKeys.stuck.all, predicate: ({ queryKey }) => queryKey[1] === 'history' });
    },
  });
};
