// Query key factory: every query key in the app comes from here.
export const queryKeys = {
  auth: {
    all: ['auth'],
    me: () => ['auth', 'me'],
  },
  meta: {
    tags: () => ['meta', 'tags'],
  },
};
