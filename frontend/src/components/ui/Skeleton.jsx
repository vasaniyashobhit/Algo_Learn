import { useReducedMotionSafe } from '../../hooks/useReducedMotionSafe.js';
import { cn } from '../../lib/cn.js';

/** A placeholder block with B's fast sweep; a flat block under reduced motion. */
export const Skeleton = ({ className, style }) => {
  const reduced = useReducedMotionSafe();
  return (
    <span
      className={cn('skeleton', className)}
      style={style}
      data-motion={reduced ? 'off' : 'on'}
      data-testid="skeleton"
      aria-hidden="true"
    />
  );
};
