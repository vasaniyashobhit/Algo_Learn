import { cn } from '../../lib/cn.js';

const TONES = {
  // The screen's one plate: yellow with Plate Ink text; buttons inside use variant="onPlate".
  plate: 'bg-plate text-plate-ink',
  info: 'bg-ground text-ink shadow-[inset_0_3px_0_var(--ink-soft)]',
  error: 'bg-ground text-ink shadow-[inset_0_3px_0_var(--miss)]',
};

/**
 * A notice strap with an optional action on the right. Errors are announced assertively,
 * everything else politely.
 */
export const Notice = ({ tone = 'info', action, className, children }) => (
  <div
    role={tone === 'error' ? 'alert' : 'status'}
    className={cn('flex flex-wrap items-center justify-between gap-x-6 gap-y-3 px-[1.2rem] py-4', TONES[tone] ?? TONES.info, className)}
  >
    <div className="min-w-0 flex-1 [&>p]:m-0">{children}</div>
    {action}
  </div>
);
