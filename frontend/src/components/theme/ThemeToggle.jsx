import { AnimatePresence, motion } from 'motion/react';
import { useReducedMotionSafe } from '../../hooks/useReducedMotionSafe.js';
import { useTheme } from '../../hooks/useTheme.js';
import { otherTheme } from '../../lib/theme.js';
import { DURATION_REVEAL, EASE, WIPE_HIDDEN, WIPE_SHOWN } from '../../lib/motionTokens.js';
import { buttonClass } from '../ui/buttonStyles.js';
import { Pressable } from '../motion/Pressable.jsx';
import { ThemeIcon } from './ThemeIcon.jsx';

const LABELS = { dark: 'Dark', light: 'Light' };
const EXIT = { clipPath: 'inset(0 0 0 100%)' };

/** Shows the current theme; the label wipes across to the new one when switched. */
export const ThemeToggle = () => {
  const { theme, toggleTheme } = useTheme();
  const reduced = useReducedMotionSafe();
  const next = otherTheme(theme);

  return (
    <Pressable
      as="button"
      type="button"
      onClick={toggleTheme}
      className={buttonClass({ variant: 'text', className: 'min-w-[5.5rem]'})}
      aria-label={`Theme: ${LABELS[theme]}. Switch to ${LABELS[next].toLowerCase()} theme`}
      title={`Switch to ${LABELS[next].toLowerCase()} theme`}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={theme}
          className="inline-flex items-center gap-2"
          initial={reduced ? false : WIPE_HIDDEN}
          animate={WIPE_SHOWN}
          exit={reduced ? undefined : EXIT}
          transition={{ duration: reduced ? 0 : DURATION_REVEAL / 2, ease: EASE }}
        >
          <ThemeIcon theme={theme} />
          {LABELS[theme]}
        </motion.span>
      </AnimatePresence>
    </Pressable>
  );
};
