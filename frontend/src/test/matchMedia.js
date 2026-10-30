// A controllable window.matchMedia for jsdom. Queries we care about:
// '(prefers-reduced-motion: reduce)' and '(prefers-color-scheme: light)'.
const state = { matches: {}, lists: new Map() };

const makeList = (query) => {
  const listeners = new Set();
  return {
    media: query,
    get matches() {
      return Boolean(state.matches[query]);
    },
    addEventListener: (_type, listener) => listeners.add(listener),
    removeEventListener: (_type, listener) => listeners.delete(listener),
    addListener: (listener) => listeners.add(listener),
    removeListener: (listener) => listeners.delete(listener),
    onchange: null,
    dispatchEvent: () => true,
    listeners,
  };
};

export const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';
export const LIGHT_SCHEME = '(prefers-color-scheme: light)';

export const installMatchMedia = ({ reducedMotion = false, light = false } = {}) => {
  state.matches = { [REDUCED_MOTION]: reducedMotion, [LIGHT_SCHEME]: light };
  state.lists = new Map();
  window.matchMedia = (query) => {
    if (!state.lists.has(query)) state.lists.set(query, makeList(query));
    return state.lists.get(query);
  };
};

/** Changes a media query result and notifies listeners, like the OS setting changing. */
export const setMediaQuery = (query, matches) => {
  state.matches[query] = matches;
  state.lists.get(query)?.listeners.forEach((listener) => listener({ matches, media: query }));
};

export const setReducedMotion = (on) => setMediaQuery(REDUCED_MOTION, on);
export const setSystemLight = (on) => setMediaQuery(LIGHT_SCHEME, on);
