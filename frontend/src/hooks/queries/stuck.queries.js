import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { fetchStuck, fetchStuckHistory, fetchStuckSolution } from '../../api/endpoints/stuck.api.js';
import { queryKeys } from '../../lib/queryKeys.js';

// A saved stuck result never changes, so it never goes stale.
const FOREVER = Number.POSITIVE_INFINITY;

/** GET /stuck/:id (POST /stuck seeds this cache, so a fresh result shows without a request). */
export const useStuckQuery = (id) =>
  useQuery({
    queryKey: queryKeys.stuck.detail(id),
    queryFn: ({ signal }) => fetchStuck(id, { signal }),
    staleTime: FOREVER,
  });

/** GET /stuck/:id/solution, only fetched once the user asks for it (the component mounts on request). */
export const useStuckSolutionQuery = (id) =>
  useQuery({
    queryKey: queryKeys.stuck.solution(id),
    queryFn: ({ signal }) => fetchStuckSolution(id, { signal }),
    staleTime: FOREVER,
  });

/** GET /stuck/history?page=… → { data, meta }. */
export const useStuckHistoryQuery = (page) =>
  useQuery({
    queryKey: queryKeys.stuck.history(page),
    queryFn: ({ signal }) => fetchStuckHistory(page, { signal }),
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  });
