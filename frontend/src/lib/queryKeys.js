// Query key factory: every query key in the app comes from here.
export const queryKeys = {
  auth: {
    all: ['auth'],
    me: () => ['auth', 'me'],
  },
  meta: {
    tags: () => ['meta', 'tags'],
  },
  stats: {
    all: ['stats'],
    summary: () => ['stats', 'summary'],
    topics: (params) => ['stats', 'topics', params],
  },
  recommendations: {
    all: ['recommendations'],
  },
  practice: {
    all: ['practice'],
    list: (status = null) => ['practice', 'list', { status }],
  },
  problems: {
    similar: (problemId, params) => ['problems', 'similar', problemId, params],
  },
};

export const mutationKeys = {
  sync: ['sync'],
};
