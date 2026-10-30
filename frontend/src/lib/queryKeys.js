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
    all: ['problems'],
    list: (params) => ['problems', 'list', params],
    detail: (problemId) => ['problems', 'detail', problemId],
    similar: (problemId, params) => ['problems', 'similar', problemId, params],
  },
  stuck: {
    all: ['stuck'],
    history: (page) => ['stuck', 'history', { page }],
    detail: (id) => ['stuck', 'detail', id],
    solution: (id) => ['stuck', 'solution', id],
  },
};

export const mutationKeys = {
  sync: ['sync'],
};
