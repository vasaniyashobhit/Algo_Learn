import { animate } from 'motion/react';
import { useEffect, useState } from 'react';
import { useReducedMotionSafe } from '../../hooks/useReducedMotionSafe.js';
import { EASE } from '../../lib/motionTokens.js';
import { cn } from '../../lib/cn.js';

const defaultFormat = (value) => String(Math.round(value));

/**
 * Counts a figure up from 0 with tabular digits. Screen readers get the final value only;
 * reduced motion shows it straight away.
 */
export const CountUp = ({ value, duration = 0.9, format = defaultFormat, className }) => {
  const reduced = useReducedMotionSafe();
  const [shown, setShown] = useState(reduced ? value : 0);

  useEffect(() => {
    if (reduced) {
      setShown(value);
      return undefined;
    }
    const controls = animate(0, value, { duration, ease: EASE, onUpdate: setShown });
    return () => controls.stop();
  }, [value, duration, reduced]);

  return (
    <span className={cn('fig', className)} data-motion={reduced ? 'off' : 'on'}>
      <span aria-hidden="true">{format(shown)}</span>
      <span className="sr-only">{format(value)}</span>
    </span>
  );
};
