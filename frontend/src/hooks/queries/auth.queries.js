import { useQuery } from '@tanstack/react-query';
import { fetchMe } from '../../api/endpoints/auth.api.js';
import { queryKeys } from '../../lib/queryKeys.js';

/** The logged-in user, loaded once per page load while a token exists. */
export const useMeQuery = ({ enabled }) =>
  useQuery({
    queryKey: queryKeys.auth.me(),
    queryFn: ({ signal }) => fetchMe({ signal }),
    enabled,
    staleTime: 5 * 60_000,
  });
