import { useCallback, useEffect, useState } from 'react';

/** { left, active, start(seconds) }: whole seconds left, ticking down once a second to 0. */
export const useCountdown = () => {
  const [left, setLeft] = useState(0);

  useEffect(() => {
    if (left <= 0) return undefined;
    const timer = setTimeout(() => setLeft((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [left]);

  const start = useCallback((seconds) => setLeft(Math.max(1, Math.ceil(Number(seconds) || 0))), []);
  return { left, active: left > 0, start };
};
