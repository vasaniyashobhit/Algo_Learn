import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { PAIR_PARAMS, RADAR_PARAMS } from '../lib/dashboardData.js';
import { pageLoaders } from '../lib/lazyPages.js';
import { recommendationsOptions } from './queries/recommendations.queries.js';
import { statsSummaryOptions, topicStatsOptions } from './queries/stats.queries.js';

/**
 * Warms everything the dashboard needs while the login redirect happens: its code chunk and its
 * four queries (summary, radar, pairs, recommendations). Fire and forget: prefetchQuery never
 * throws, and a failed chunk load is retried by React.lazy when the page renders.
 */
export const usePrefetchDashboard = () => {
  const queryClient = useQueryClient();
  return useCallback(() => {
    pageLoaders.dashboard().catch(() => {});
    [statsSummaryOptions(), topicStatsOptions(RADAR_PARAMS), topicStatsOptions(PAIR_PARAMS), recommendationsOptions()]
      .forEach((options) => queryClient.prefetchQuery(options));
  }, [queryClient]);
};
