import { useQuery } from '@tanstack/react-query';
import { fetchRecommendations } from '../../api/endpoints/recommendations.api.js';
import { queryKeys } from '../../lib/queryKeys.js';

/** Query options shared by the hook and the dashboard prefetch. */
export const recommendationsOptions = () => ({
  queryKey: queryKeys.recommendations.all,
  queryFn: ({ signal }) => fetchRecommendations({ signal }),
  staleTime: 10 * 60_000,
});

/** GET /recommendations → { data: { topics }, meta }. Never blank, even without a handle. */
export const useRecommendationsQuery = () => useQuery(recommendationsOptions());
