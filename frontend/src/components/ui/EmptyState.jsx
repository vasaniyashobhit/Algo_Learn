import { cn } from '../../lib/cn.js';

/**
 * Says what is missing and what to do next. `figure` is an optional big scoreboard number
 * (decorative; the title carries the meaning).
 */
export const EmptyState = ({ figure, title, action, className, children }) => (
  <section className={cn('grid items-center gap-8 bg-band p-[1.6rem] sm:grid-cols-[auto_1fr]', className)}>
    {figure !== undefined && (
      <p className="fig m-0 text-step-4 leading-none text-ink-soft" aria-hidden="true">
        {figure}
      </p>
    )}
    <div>
      <h2 className="text-step-2">{title}</h2>
      {children && <div className="text-ink-soft">{children}</div>}
      {action && <div className="mt-4 flex flex-wrap gap-3">{action}</div>}
    </div>
  </section>
);
