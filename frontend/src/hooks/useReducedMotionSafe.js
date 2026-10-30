import { useSyncExternalStore } from 'react';

const QUERY = '(prefers-reduced-motion: reduce)';

const getQuery = () => (typeof window === 'undefined' ? null : (window.matchMedia?.(QUERY) ?? null));

const subscribe = (onChange) => {
  const query = getQuery();
  query?.addEventListener?.('change', onChange);
  return () => query?.removeEventListener?.('change', onChange);
};

const getSnapshot = () => Boolean(getQuery()?.matches);

/** true when the user asked for reduced motion. Always a boolean, and live-updating. */
export const useReducedMotionSafe = () => useSyncExternalStore(subscribe, getSnapshot, () => false);
