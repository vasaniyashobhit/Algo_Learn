import { useReducedMotionSafe } from '../../hooks/useReducedMotionSafe.js';
import { DURATION_ENTER, EASE, WIPE_HIDDEN, WIPE_SHOWN } from '../../lib/motionTokens.js';
import { pickTag } from './motionTags.js';

/** Wipes its content on from the left, like a broadcast graphic. Instant under reduced motion. */
export const Wipe = ({ as = 'div', delay = 0, duration = DURATION_ENTER, children, ...props }) => {
  const reduced = useReducedMotionSafe();
  const Component = pickTag(as, reduced);
  const motionProps = reduced
    ? {}
    : { initial: WIPE_HIDDEN, animate: WIPE_SHOWN, transition: { duration, delay, ease: EASE } };
  return (
    <Component data-motion={reduced ? 'off' : 'on'} {...motionProps} {...props}>
      {children}
    </Component>
  );
};
