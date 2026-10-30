import { cn } from '../../lib/cn.js';

/**
 * A section heading with its plain-language title first and the cricket name as a small
 * caption next to it (The Caption Rule). `action` sits on the right, e.g. a table toggle.
 */
export const PanelHeading = ({ id, title, caption, action, as: Heading = 'h2', className }) => (
  <div className={cn('mb-4 flex flex-wrap items-baseline gap-x-3 gap-y-1', className)}>
    <Heading id={id} className="m-0 text-step-1">
      {title}
    </Heading>
    {caption && <span className="caption">{caption}</span>}
    {action && <div className="ml-auto">{action}</div>}
  </div>
);
