import { useCallback, useEffect, useRef, useState } from 'react';

/** [on, trigger]: `on` turns true when triggered and back to false after `ms` (for success marks). */
export const useFlash = (ms = 1600) => {
  const [on, setOn] = useState(false);
  const timer = useRef(null);

  const trigger = useCallback(() => {
    clearTimeout(timer.current);
    setOn(true);
    timer.current = setTimeout(() => setOn(false), ms);
  }, [ms]);

  useEffect(() => () => clearTimeout(timer.current), []);
  return [on, trigger];
};
