import { motion } from 'motion/react';
import { useReducedMotionSafe } from '../../hooks/useReducedMotionSafe.js';
import { cn } from '../../lib/cn.js';
import { DURATION_ENTER, EASE } from '../../lib/motionTokens.js';

/**
 * A thin 0–1 strength bar that grows from the left. Decorative: the number next to it carries
 * the value. `null` (no stats) draws an empty track.
 */
export const StrengthBar = ({ value, className, fill = 'bg-miss' }) => {
  const reduced = useReducedMotionSafe();
  const share = Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0;
  const style = { width: `${Math.round(share * 100)}%`, transformOrigin: 'left' };
  return (
    <span aria-hidden="true" data-testid="strength-bar" className={cn('block h-1.5 w-full bg-band-2', className)}>
      {reduced ? (
        <span className={cn('block h-full', fill)} style={style} data-motion="off" />
      ) : (
        <motion.span
          className={cn('block h-full', fill)}
          style={style}
          data-motion="on"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: DURATION_ENTER, ease: EASE, delay: 0.12 }}
        />
      )}
    </span>
  );
};
