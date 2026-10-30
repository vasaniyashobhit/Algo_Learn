import { useReducedMotionSafe } from '../../hooks/useReducedMotionSafe.js';
import { cn } from '../../lib/cn.js';
import { DURATION_ENTER, EASE, WIPE_HIDDEN, WIPE_SHOWN } from '../../lib/motionTokens.js';
import { pickTag } from './motionTags.js';

/**
 * Wipes its content on from the left, like a broadcast graphic. Under reduced motion it does not
 * travel: it fades in over 160 ms (`.reduced-enter`), so a new hint still registers as new.
 */
export const Wipe = ({ as = 'div', delay = 0, duration = DURATION_ENTER, className, children, ...props }) => {
  const reduced = useReducedMotionSafe();
  const Component = pickTag(as, reduced);
  const motionProps = reduced
    ? {}
    : { initial: WIPE_HIDDEN, animate: WIPE_SHOWN, transition: { duration, delay, ease: EASE } };
  return (
    <Component data-motion={reduced ? 'off' : 'on'} className={cn(className, reduced && 'reduced-enter')} {...motionProps} {...props}>
      {children}
    </Component>
  );
};
