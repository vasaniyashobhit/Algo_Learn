import { cn } from '../../lib/cn.js';

/** Only used inside buttons; content loading uses skeletons. */
export const Spinner = ({ className }) => <span className={cn('spinner', className)} aria-hidden="true" />;
