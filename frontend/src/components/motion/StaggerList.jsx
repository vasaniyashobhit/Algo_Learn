import { useReducedMotionSafe } from '../../hooks/useReducedMotionSafe.js';
import { STAGGER } from '../../lib/motionTokens.js';
import { pickTag } from './motionTags.js';

const CONTAINER = { hidden: {}, shown: { transition: { staggerChildren: STAGGER } } };

/**
 * A list whose StaggerItem children wipe on one after another, 45 ms apart.
 * `as` can be ul, ol, dl, div or tbody. Everything is shown at once under reduced motion.
 */
export const StaggerList = ({ as = 'ul', children, ...props }) => {
  const reduced = useReducedMotionSafe();
  const Component = pickTag(as, reduced);
  const motionProps = reduced ? {} : { variants: CONTAINER, initial: 'hidden', animate: 'shown' };
  return (
    <Component data-motion={reduced ? 'off' : 'on'} {...motionProps} {...props}>
      {children}
    </Component>
  );
};
