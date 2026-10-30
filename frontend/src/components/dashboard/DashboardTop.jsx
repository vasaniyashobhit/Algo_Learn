import { getUserMessage, isUnexpectedError } from '../../errors/getUserMessage.js';
import { ErrorState } from '../ui/ErrorState.jsx';
import { DashboardHeader } from './DashboardHeader.jsx';
import { DashboardHeaderSkeleton } from './DashboardHeaderSkeleton.jsx';
import { FirstSyncNotice } from './FirstSyncNotice.jsx';
import { HandleOnboarding } from './HandleOnboarding.jsx';

/**
 * The top of the dashboard, by state: skeleton, an error with retry, the handle-link hero
 * (NO_HANDLE), the first-sync plate (NOT_SYNCED), or the scoreboard with figures.
 */
export const DashboardTop = ({ summary, reason }) => {
  if (summary.isPending) return <DashboardHeaderSkeleton />;
  if (summary.isError && !summary.data) {
    const { error } = summary;
    return (
      <div className="wrap pt-6">
        <h1 className="sr-only">Dashboard</h1>
        <ErrorState
          title="Your scoreboard didn't load"
          message={getUserMessage(error)}
          requestId={isUnexpectedError(error) ? error?.requestId : undefined}
          onRetry={() => summary.refetch()}
        />
      </div>
    );
  }
  if (reason === 'NO_HANDLE') return <HandleOnboarding />;
  if (reason === 'NOT_SYNCED') {
    return (
      <>
        <DashboardHeader summary={summary.data} showTiles={false} />
        <FirstSyncNotice handle={summary.data.meta.cfHandle} />
      </>
    );
  }
  return <DashboardHeader summary={summary.data} />;
};
