import { motion } from 'motion/react';
import { useLocation } from 'react-router';
import { useReducedMotionSafe } from '../../hooks/useReducedMotionSafe.js';
import { DURATION_ENTER, EASE } from '../../lib/motionTokens.js';

const HIDDEN = { opacity: 0, clipPath: 'inset(0 0 0 6%)' };
const SHOWN = { opacity: 1, clipPath: 'inset(0 0 0 0%)' };

/** Each route change wipes the page in briefly. A plain wrapper under reduced motion. */
export const PageTransition = ({ children, className }) => {
  const reduced = useReducedMotionSafe();
  const { pathname } = useLocation();
  if (reduced) {
    return (
      <div data-motion="off" className={className}>
        {children}
      </div>
    );
  }
  return (
    <motion.div
      key={pathname}
      data-motion="on"
      className={className}
      initial={HIDDEN}
      animate={SHOWN}
      transition={{ duration: DURATION_ENTER, ease: EASE }}
    >
      {children}
    </motion.div>
  );
};
