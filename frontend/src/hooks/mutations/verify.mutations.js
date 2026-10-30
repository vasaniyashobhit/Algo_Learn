import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { verifyPractice } from '../../api/endpoints/practice.api.js';
import { upsertItem } from '../../lib/practiceCache.js';
import { queryKeys } from '../../lib/queryKeys.js';
import { usePracticeCache } from './practiceOptimistic.js';

// Recommendations drop solved problems; refetching them only after the success mark has
// played keeps the card from vanishing under the user's cursor.
export const RECOMMENDATIONS_REFRESH_MS = 1800;

/**
 * POST /practice/:id/verify ("I solved it"). A verified solve moves the item to "solved" in
 * every cached list at once, then stats, the user and recommendations refresh (the check ran
 * a sync). `verified: false` answers are returned to the caller, which words them.
 */
export const useVerifyPracticeMutation = () => {
  const queryClient = useQueryClient();
  const cache = usePracticeCache();
  return useMutation({
    mutationFn: verifyPractice,
    onSuccess: (result, { problemId }) => {
      if (!result.verified) return;
      cache.apply((list, status) => upsertItem(list, { ...result.item, optimistic: false }, status));
      toast.success(`${problemId} verified as solved on Codeforces.`);
      setTimeout(() => queryClient.invalidateQueries({ queryKey: queryKeys.recommendations.all }), RECOMMENDATIONS_REFRESH_MS);
    },
    onSettled: (result) =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.stats.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.auth.me() }),
        result?.verified ? queryClient.invalidateQueries({ queryKey: queryKeys.practice.all }) : null,
      ]),
  });
};
