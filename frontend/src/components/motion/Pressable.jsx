import { useReducedMotionSafe } from '../../hooks/useReducedMotionSafe.js';
import { DURATION_PRESS, EASE, PRESS_SCALE } from '../../lib/motionTokens.js';
import { pickTag } from './motionTags.js';

const PRESS = { scale: PRESS_SCALE };
const LIFT = { y: -1 };
const TRANSITION = { duration: DURATION_PRESS, ease: EASE };

/**
 * Wraps anything clickable: snaps to 96% when pressed and lifts 1px on hover.
 * `as` is a tag name or "link" / "navlink" for router links. Still under reduced motion.
 */
export const Pressable = ({ as = 'button', children, ...props }) => {
  const reduced = useReducedMotionSafe();
  const Component = pickTag(as, reduced);
  const motionProps = reduced ? {} : { whileTap: PRESS, whileHover: LIFT, transition: TRANSITION };
  return (
    <Component data-motion={reduced ? 'off' : 'on'} {...motionProps} {...props}>
      {children}
    </Component>
  );
};
