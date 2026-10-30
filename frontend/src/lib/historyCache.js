// Pure helpers for the optimistic stuck-history delete. Pages are cached as { data, meta }.

export const isHistoryKey = (queryKey) => queryKey?.[0] === 'stuck' && queryKey?.[1] === 'history';

/** A page without the given ids; meta.total drops by the number actually removed. */
export const withoutIds = (page, ids) => {
  if (!page) return page;
  const data = page.data.filter((item) => !ids.has(item.id));
  const removed = page.data.length - data.length;
  if (!removed) return page;
  return { ...page, data, meta: { ...page.meta, total: Math.max(0, (page.meta?.total ?? 0) - removed) } };
};

/** "Flowers (474/D)" or "Untitled problem", for toasts about a history entry. */
export const historyLabel = ({ problem }) => {
  const title = problem?.title || 'Untitled problem';
  const id = problem?.matchedProblemId ?? problem?.requestedProblemId;
  return id ? `${title} (${id})` : title;
};
