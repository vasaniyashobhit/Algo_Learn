import { useNow } from '../../hooks/useNow.js';
import { formatRelativeTime } from '../../lib/relativeTime.js';

/** "Synced 2 hours ago" (exact time on hover), or "Not synced yet". */
export const LastSynced = ({ at, className }) => {
  const now = useNow();
  if (!at) return <span className={className}>Not synced yet</span>;
  return (
    <span className={className}>
      Synced{' '}
      <time dateTime={at} title={new Date(at).toLocaleString()}>
        {formatRelativeTime(at, now)}
      </time>
    </span>
  );
};
