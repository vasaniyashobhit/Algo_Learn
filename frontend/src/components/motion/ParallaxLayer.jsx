import { motion } from 'motion/react';
import { useParallax } from '../../hooks/useParallax.js';
import { useReducedMotionSafe } from '../../hooks/useReducedMotionSafe.js';

/** A depth plane for the landing hero: moves `depth` px per px scrolled (transform only). */
export const ParallaxLayer = ({ depth, style, children, ...props }) => {
  const reduced = useReducedMotionSafe();
  const y = useParallax(depth);
  return (
    <motion.div data-depth={depth} data-motion={reduced ? 'off' : 'on'} style={{ ...style, y }} {...props}>
      {children}
    </motion.div>
  );
};
