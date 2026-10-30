import { useMotionValue, useScroll, useTransform } from 'motion/react';
import { useReducedMotionSafe } from './useReducedMotionSafe.js';

/**
 * A y offset that moves `depth` px for every px scrolled (0 = fixed to the page, 1 = fixed to
 * the screen). Returns a still motion value of 0 under reduced motion.
 */
export const useParallax = (depth) => {
  const reduced = useReducedMotionSafe();
  const { scrollY } = useScroll();
  const moving = useTransform(scrollY, (value) => value * depth);
  const still = useMotionValue(0);
  return reduced ? still : moving;
};
