import { useQuery } from '@tanstack/react-query';
import { fetchSimilar } from '../../api/endpoints/problems.api.js';
import { queryKeys } from '../../lib/queryKeys.js';

/** GET /problems/:contestId/:index/similar → { data, meta }. */
export const useSimilarQuery = (problemId, params = { k: 10 }) =>
  useQuery({
    queryKey: queryKeys.problems.similar(problemId, params),
    queryFn: ({ signal }) => fetchSimilar(problemId, params, { signal }),
    staleTime: 30 * 60_000,
  });
