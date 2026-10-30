import { useReducedMotionSafe } from '../../hooks/useReducedMotionSafe.js';
import { DURATION_ENTER, EASE, WIPE_HIDDEN, WIPE_SHOWN } from '../../lib/motionTokens.js';
import { pickTag } from './motionTags.js';

const ITEM = {
  hidden: WIPE_HIDDEN,
  shown: { ...WIPE_SHOWN, transition: { duration: DURATION_ENTER, ease: EASE } },
};

/** One entry of a StaggerList (li, tr, div ...). Takes its timing from the parent list. */
export const StaggerItem = ({ as = 'li', children, ...props }) => {
  const reduced = useReducedMotionSafe();
  const Component = pickTag(as, reduced);
  const motionProps = reduced ? {} : { variants: ITEM };
  return (
    <Component {...motionProps} {...props}>
      {children}
    </Component>
  );
};
