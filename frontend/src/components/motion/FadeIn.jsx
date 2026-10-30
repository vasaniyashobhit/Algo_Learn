import { useReducedMotionSafe } from '../../hooks/useReducedMotionSafe.js';
import { DURATION_ENTER, EASE } from '../../lib/motionTokens.js';
import { pickTag } from './motionTags.js';

const HIDDEN = { opacity: 0, y: 6 };
const SHOWN = { opacity: 1, y: 0 };

/** Fades content in with a 6px rise. Renders the final state under reduced motion. */
export const FadeIn = ({ as = 'div', delay = 0, children, ...props }) => {
  const reduced = useReducedMotionSafe();
  const Component = pickTag(as, reduced);
  const motionProps = reduced
    ? {}
    : { initial: HIDDEN, animate: SHOWN, transition: { duration: DURATION_ENTER, delay, ease: EASE } };
  return (
    <Component data-motion={reduced ? 'off' : 'on'} {...motionProps} {...props}>
      {children}
    </Component>
  );
};
