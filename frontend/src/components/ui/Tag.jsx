import { cn } from '../../lib/cn.js';

const BASE =
  'inline-block whitespace-nowrap px-[0.45rem] py-[0.15rem] font-display text-[0.8rem] leading-[1.2] ' +
  'font-semibold uppercase tracking-[0.05em]';

const TONES = {
  default: 'bg-band-2 text-ink',
  // A concept-gap topic: outlined in Miss and labelled, so colour is not the only signal.
  gap: 'bg-transparent text-miss shadow-[inset_0_0_0_1.5px_var(--miss)]',
};

export const Tag = ({ tone = 'default', className, children, ...props }) => (
  <span className={cn(BASE, TONES[tone] ?? TONES.default, className)} {...props}>
    {children}
    {tone === 'gap' && <span className="sr-only"> (concept gap)</span>}
  </span>
);
