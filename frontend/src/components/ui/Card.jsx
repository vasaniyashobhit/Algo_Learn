import { cn } from '../../lib/cn.js';

const TONES = {
  band: 'bg-band text-ink shadow-panel',
  chalk: 'bg-chalk text-chalk-ink shadow-panel',
  flat: 'bg-band text-ink',
};

/** A square panel: band (default), chalk (a scoreboard surface) or flat (no shadow). */
export const Card = ({ as: Tag = 'div', tone = 'band', className, children, ...props }) => (
  <Tag className={cn('p-[1.6rem]', TONES[tone] ?? TONES.band, className)} {...props}>
    {children}
  </Tag>
);
