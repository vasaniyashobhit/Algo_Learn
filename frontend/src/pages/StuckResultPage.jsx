import { useParams } from 'react-router';
import { StuckResult } from '../components/stuck/StuckResult.jsx';
import { StuckResultSkeleton } from '../components/stuck/StuckResultSkeleton.jsx';
import { Button } from '../components/ui/Button.jsx';
import { ErrorState } from '../components/ui/ErrorState.jsx';
import { getUserMessage, isUnexpectedError } from '../errors/getUserMessage.js';
import { useStuckQuery } from '../hooks/queries/stuck.queries.js';
import { usePageTitle } from '../hooks/usePageTitle.js';
import { stuckTitle } from '../lib/stuckLabels.js';

/** /stuck/:id: one stuck result (fresh from POST /stuck, or reopened from the history). */
export const StuckResultPage = () => {
  const { id } = useParams();
  const query = useStuckQuery(id);
  usePageTitle(query.data ? `Stuck: ${stuckTitle(query.data.problem)}` : 'Stuck result');

  if (query.isPending) return <StuckResultSkeleton />;
  if (query.isError) {
    const { error } = query;
    const missing = error?.code === 'STUCK_QUERY_NOT_FOUND';
    return (
      <div className="wrap pt-8 pb-16">
        <ErrorState
          title={missing ? 'This stuck result is gone' : "This stuck result didn't load"}
          message={getUserMessage(error, 'stuck')}
          requestId={isUnexpectedError(error) ? error?.requestId : undefined}
          onRetry={missing ? undefined : () => query.refetch()}
          action={
            <>
              <Button variant="outline" to="/history">
                Open history
              </Button>
              <Button variant="text" to="/stuck">
                Ask about a problem
              </Button>
            </>
          }
        />
      </div>
    );
  }
  return <StuckResult result={query.data} />;
};
