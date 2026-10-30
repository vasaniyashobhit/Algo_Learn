import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router';

/**
 * Keeps the current page's link visible inside a sideways-scrolling nav (phones): after every
 * navigation the `aria-current="page"` link is scrolled into view. Returns the ref for the nav.
 */
export const useActiveIntoView = () => {
  const ref = useRef(null);
  const { pathname } = useLocation();
  useEffect(() => {
    const active = ref.current?.querySelector('[aria-current="page"]');
    active?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
  }, [pathname]);
  return ref;
};
