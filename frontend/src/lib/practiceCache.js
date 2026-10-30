// Pure helpers for optimistic practice-list updates. Lists are cached per status filter
// (null = all), so every change is applied to each cached list according to its filter.

export const filterOf = (queryKey) => queryKey?.[2]?.status ?? null;

const belongs = (item, status) => status === null || item.status === status;

const withTotal = (list, data) => ({ ...list, data, meta: { ...list.meta, total: data.length } });

/** Put a new or changed item into a list (new items go first), or drop it when the filter excludes it. */
export const upsertItem = (list, item, status) => {
  if (!list) return list;
  const exists = list.data.some((entry) => entry.problemId === item.problemId);
  if (!belongs(item, status)) {
    return exists ? withTotal(list, list.data.filter((entry) => entry.problemId !== item.problemId)) : list;
  }
  if (!exists) return withTotal(list, [item, ...list.data]);
  return withTotal(list, list.data.map((entry) => (entry.problemId === item.problemId ? { ...entry, ...item } : entry)));
};

export const removeItem = (list, problemId) =>
  list ? withTotal(list, list.data.filter((entry) => entry.problemId !== problemId)) : list;

/** The first cached copy of an item across every list snapshot ([queryKey, list] pairs). */
export const findItem = (lists, problemId) =>
  lists.flatMap(([, list]) => list?.data ?? []).find((entry) => entry.problemId === problemId) ?? null;

/** The item shown until the server answers; replaced by the real one in onSuccess. */
export const optimisticItem = ({ problemId, addedFrom = 'manual', problem = null }, now = new Date()) => ({
  id: `optimistic-${problemId}`,
  problemId,
  status: 'todo',
  addedFrom,
  createdAt: now.toISOString(),
  updatedAt: now.toISOString(),
  problem,
  optimistic: true,
});

export const STATUS_LABELS = { todo: 'To do', solved: 'Solved', skipped: 'Skipped' };
export const ADDED_FROM_LABELS = { recommendation: 'Dashboard', similar: 'Similar', stuck: 'Stuck', manual: 'Added by you' };
