import { useQuery } from '@tanstack/react-query';
import { fetchTags } from '../../api/endpoints/meta.api.js';
import { queryKeys } from '../../lib/queryKeys.js';

/** GET /meta/tags: the 36 topic tags and all 37 tags. They only change with a deploy. */
export const useTagsQuery = () =>
  useQuery({
    queryKey: queryKeys.meta.tags(),
    queryFn: ({ signal }) => fetchTags({ signal }),
    staleTime: Number.POSITIVE_INFINITY,
  });
