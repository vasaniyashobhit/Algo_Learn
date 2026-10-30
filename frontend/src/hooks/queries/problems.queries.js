import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { fetchProblem, fetchProblems, fetchSimilar } from '../../api/endpoints/problems.api.js';
import { queryKeys } from '../../lib/queryKeys.js';

// Problems only change with the weekly import, so cached answers stay good for a long time.
const PROBLEM_STALE_MS = 30 * 60_000;

/** GET /problems/:contestId/:index/similar → { data, meta }. */
export const useSimilarQuery = (problemId, params = { k: 10 }) =>
  useQuery({
    queryKey: queryKeys.problems.similar(problemId, params),
    queryFn: ({ signal }) => fetchSimilar(problemId, params, { signal }),
    staleTime: PROBLEM_STALE_MS,
  });

/** GET /problems/:contestId/:index → the full problem. */
export const useProblemQuery = (problemId) =>
  useQuery({
    queryKey: queryKeys.problems.detail(problemId),
    queryFn: ({ signal }) => fetchProblem(problemId, { signal }),
    staleTime: PROBLEM_STALE_MS,
  });

/** GET /problems with filters → { data, meta }. The previous page stays on screen while the next loads. */
export const useProblemsQuery = (params) =>
  useQuery({
    queryKey: queryKeys.problems.list(params),
    queryFn: ({ signal }) => fetchProblems(params, { signal }),
    staleTime: PROBLEM_STALE_MS,
    placeholderData: keepPreviousData,
  });
