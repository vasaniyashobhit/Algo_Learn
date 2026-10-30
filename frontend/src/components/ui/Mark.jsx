import { cn } from '../../lib/cn.js';

// State by shape, never colour alone: ■ solved, □ to do / tried, × wrong, – skipped.
const SHAPES = {
  solved: 'bg-current',
  open: 'shadow-[inset_0_0_0_2px_currentColor]',
  miss: 'mark-miss text-miss',
  skipped: 'mark-skip',
};

/** A 12px state mark with its meaning for screen readers (`label`). */
export const Mark = ({ shape = 'open', label, className }) => (
  <span className={cn('inline-flex items-center', className)}>
    <span aria-hidden="true" className={cn('inline-block size-3 shrink-0', SHAPES[shape] ?? SHAPES.open)} />
    {label && <span className="sr-only">{label}</span>}
  </span>
);
