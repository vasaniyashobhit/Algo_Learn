import { useIsSyncing } from '../../hooks/mutations/sync.mutations.js';
import { Notice } from '../ui/Notice.jsx';
import { NextSteps } from './NextSteps.jsx';
import { SyncButton } from './SyncButton.jsx';

/** Linked but never synced: the plate says what is happening and offers "Sync now". */
export const FirstSyncNotice = ({ handle }) => {
  const syncing = useIsSyncing();
  return (
    <Notice tone="plate" className="on-plate wrap mt-6 px-[1.6rem] py-6" action={<SyncButton variant="onPlate" />}>
      <h2 className="m-0 text-step-2">
        {syncing ? `Reading ${handle}'s submissions` : `${handle} is linked. First sync pending.`}
      </h2>
      <p className="mt-2 mb-5">
        {syncing
          ? 'This takes about a minute. Your topic scoreboard appears here as soon as it finishes.'
          : 'Press Sync now to import your submissions. It takes about a minute.'}
      </p>
      <NextSteps current="sync" />
    </Notice>
  );
};
