import { useQuery } from '@tanstack/react-query';
import { fetchStatsSummary, fetchTopicStats } from '../../api/endpoints/stats.api.js';
import { queryKeys } from '../../lib/queryKeys.js';

// Stats only change after a sync, which invalidates them, so they can stay fresh for a while.
const STATS_STALE_MS = 5 * 60_000;

/** Query options shared by the hooks and the dashboard prefetch (same key, same fetcher). */
export const statsSummaryOptions = () => ({
  queryKey: queryKeys.stats.summary(),
  queryFn: ({ signal }) => fetchStatsSummary({ signal }),
  staleTime: STATS_STALE_MS,
});

export const topicStatsOptions = (params) => ({
  queryKey: queryKeys.stats.topics(params),
  queryFn: ({ signal }) => fetchTopicStats(params, { signal }),
  staleTime: STATS_STALE_MS,
});

/** GET /users/me/stats/summary → { data, meta } (meta.reason NO_HANDLE / NOT_SYNCED when empty). */
export const useStatsSummaryQuery = () => useQuery(statsSummaryOptions());

/** GET /users/me/stats with { kind, sort, limit } → { data, meta }. */
export const useTopicStatsQuery = (params) => useQuery(topicStatsOptions(params));

/** The reason a stats answer is empty on purpose, or null when there is real data. */
export const statsReason = (query) => query.data?.meta?.reason ?? null;
