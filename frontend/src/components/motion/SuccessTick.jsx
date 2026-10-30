import { motion } from 'motion/react';
import { useReducedMotionSafe } from '../../hooks/useReducedMotionSafe.js';
import { EASE } from '../../lib/motionTokens.js';
import { cn } from '../../lib/cn.js';

const PATH = 'M4 12.5l5 5L20 6.5';

/**
 * The confirmation after an optimistic action: a tick that draws itself in 280 ms with a
 * small snap. A plain tick under reduced motion. Decorative; the button text says what happened.
 */
export const SuccessTick = ({ className }) => {
  const reduced = useReducedMotionSafe();
  const svgClass = cn('inline-block size-[1em] shrink-0', className);
  if (reduced) {
    return (
      <svg viewBox="0 0 24 24" className={svgClass} aria-hidden="true" data-motion="off" data-testid="success-tick">
        <path d={PATH} fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="square" />
      </svg>
    );
  }
  return (
    <motion.svg
      viewBox="0 0 24 24"
      className={svgClass}
      aria-hidden="true"
      data-motion="on"
      data-testid="success-tick"
      initial={{ scale: 0.6 }}
      animate={{ scale: 1 }}
      transition={{ duration: 0.18, ease: EASE }}
    >
      <motion.path
        d={PATH}
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="square"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.28, ease: EASE }}
      />
    </motion.svg>
  );
};
