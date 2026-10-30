import { useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { filterOf } from '../../lib/practiceCache.js';
import { queryKeys } from '../../lib/queryKeys.js';

const isList = (queryKey) => queryKey[1] === 'list';

/**
 * Cache plumbing shared by the practice mutations: snapshot every cached list, apply a change
 * to each according to its status filter, roll back, and refresh after the server answers.
 */
export const usePracticeCache = () => {
  const queryClient = useQueryClient();
  return useMemo(() => {
    const apply = (update) =>
      queryClient
        .getQueriesData({ queryKey: queryKeys.practice.all })
        .filter(([key, list]) => isList(key) && list)
        .forEach(([key, list]) => queryClient.setQueryData(key, update(list, filterOf(key))));

    const snapshot = async () => {
      await queryClient.cancelQueries({ queryKey: queryKeys.practice.all });
      return queryClient.getQueriesData({ queryKey: queryKeys.practice.all });
    };

    const rollback = (snapshots = []) => snapshots.forEach(([key, list]) => queryClient.setQueryData(key, list));

    // Recommendations skip practice items; mark them stale without pulling cards out from under the user.
    const settle = () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.practice.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.recommendations.all, refetchType: 'none' }),
      ]);

    return { apply, snapshot, rollback, settle };
  }, [queryClient]);
};
