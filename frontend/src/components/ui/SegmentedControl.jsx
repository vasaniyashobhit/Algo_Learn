import { cn } from '../../lib/cn.js';
import { Pressable } from '../motion/Pressable.jsx';

const BASE =
  'border-0 px-[0.9rem] py-[0.55rem] font-display text-[0.95rem] leading-none font-bold uppercase tracking-[0.06em]';
const IDLE = 'bg-band-2 text-ink-soft hover:text-ink';
const ACTIVE = 'bg-ink text-ground';

/** A row of toggle buttons (aria-pressed), e.g. the practice status filter. */
export const SegmentedControl = ({ label, options, value, onChange, className }) => (
  <div role="group" aria-label={label} className={cn('flex flex-wrap', className)}>
    {options.map((option) => {
      const active = option.value === value;
      return (
        <Pressable
          key={String(option.value)}
          type="button"
          aria-pressed={active}
          className={cn(BASE, active ? ACTIVE : IDLE)}
          onClick={() => onChange(option.value)}
        >
          {option.label}
          {option.count !== undefined && (
            <>
              {' '}
              <span className="num ml-1 opacity-70">{option.count}</span>
            </>
          )}
        </Pressable>
      );
    })}
  </div>
);
