import { useQuery } from '@tanstack/react-query';
import { fetchRecommendations } from '../../api/endpoints/recommendations.api.js';
import { queryKeys } from '../../lib/queryKeys.js';

/** GET /recommendations → { data: { topics }, meta }. Never blank, even without a handle. */
export const useRecommendationsQuery = () =>
  useQuery({
    queryKey: queryKeys.recommendations.all,
    queryFn: ({ signal }) => fetchRecommendations({ signal }),
    staleTime: 10 * 60_000,
  });
