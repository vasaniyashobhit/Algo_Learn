import { motion } from 'motion/react';
import { Link, NavLink } from 'react-router';

// Created once at module level: motion.create inside render would remount every time.
const MotionLink = motion.create(Link);
const MotionNavLink = motion.create(NavLink);

export const motionTags = {
  a: motion.a,
  button: motion.button,
  div: motion.div,
  li: motion.li,
  ol: motion.ol,
  section: motion.section,
  span: motion.span,
  tbody: motion.tbody,
  tr: motion.tr,
  ul: motion.ul,
  dl: motion.dl,
  link: MotionLink,
  navlink: MotionNavLink,
};

/** Plain counterparts used when the user prefers reduced motion. */
export const plainTags = {
  link: Link,
  navlink: NavLink,
};

export const pickTag = (as, reduced) => (reduced ? (plainTags[as] ?? as) : (motionTags[as] ?? motion.div));
