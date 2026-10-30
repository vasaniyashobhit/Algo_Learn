import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { fetchPractice } from '../../api/endpoints/practice.api.js';
import { queryKeys } from '../../lib/queryKeys.js';

/** GET /practice?status=… → { data, meta }. `status` null means every item. */
export const usePracticeQuery = (status = null) =>
  useQuery({
    queryKey: queryKeys.practice.list(status),
    queryFn: ({ signal }) => fetchPractice(status, { signal }),
    staleTime: 60_000,
  });

/** problemId → status for everything in the list, so cards can say "In practice". */
export const usePracticeStatuses = () => {
  const { data } = usePracticeQuery(null);
  return useMemo(() => new Map((data?.data ?? []).map((item) => [item.problemId, item.status])), [data]);
};
