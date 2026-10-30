import { cn } from '../../lib/cn.js';
import { Button } from './Button.jsx';

/**
 * A full error panel: what went wrong, a way out, and the request id in small text so the
 * user can report it.
 */
export const ErrorState = ({
  title = 'Something went wrong',
  message,
  requestId,
  onRetry,
  retryLabel = 'Try again',
  action,
  className,
}) => (
  <section role="alert" className={cn('bg-band p-[1.6rem] shadow-[inset_0_3px_0_var(--miss)]', className)}>
    <h2 className="text-step-2">{title}</h2>
    {message && <p className="text-ink-soft">{message}</p>}
    {(onRetry || action) && (
      <div className="mt-4 flex flex-wrap gap-3">
        {onRetry && (
          <Button variant="outline" onClick={onRetry}>
            {retryLabel}
          </Button>
        )}
        {action}
      </div>
    )}
    {requestId && (
      <p className="mt-4 mb-0 text-step--1 text-ink-soft">
        Reference: <code className="num select-all">{requestId}</code>
      </p>
    )}
  </section>
);
