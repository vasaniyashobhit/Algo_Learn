import { useIsSyncing, useSyncMutation } from '../../hooks/mutations/sync.mutations.js';
import { Button } from '../ui/Button.jsx';

const SyncIcon = () => (
  <svg viewBox="0 0 24 24" className="size-[1.05em]" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <path d="M20 11a8 8 0 0 0-14.3-4.9L4 8m0-4v4h4M4 13a8 8 0 0 0 14.3 4.9L20 16m0 4v-4h-4" />
  </svg>
);

/**
 * "Sync now". Switches to "Syncing…" the moment it is pressed (and stays that way on every
 * screen while the sync runs); results and errors arrive as toasts from the mutation.
 */
export const SyncButton = ({ variant = 'onChalk', label = 'Sync now' }) => {
  const sync = useSyncMutation();
  const syncing = useIsSyncing();
  return (
    <>
      <Button variant={variant} loading={syncing} onClick={() => sync.mutate()}>
        {!syncing && <SyncIcon />}
        {syncing ? 'Syncing…' : label}
      </Button>
      <span className="sr-only" role="status">
        {syncing ? 'Syncing your Codeforces submissions. This can take a minute.' : ''}
      </span>
    </>
  );
};
