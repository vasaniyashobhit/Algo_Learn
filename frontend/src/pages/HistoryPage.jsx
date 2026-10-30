import { useSearchParams } from 'react-router';
import { HistorySkeleton } from '../components/history/HistorySkeleton.jsx';
import { HistoryTable } from '../components/history/HistoryTable.jsx';
import { Button } from '../components/ui/Button.jsx';
import { EmptyState } from '../components/ui/EmptyState.jsx';
import { Pager } from '../components/ui/Pager.jsx';
import { QueryState } from '../components/ui/QueryState.jsx';
import { useDeleteStuckWithUndo } from '../hooks/mutations/stuckDelete.mutations.js';
import { useStuckHistoryQuery } from '../hooks/queries/stuck.queries.js';
import { usePageTitle } from '../hooks/usePageTitle.js';

const pageFrom = (params) => {
  const page = Number(params.get('page'));
  return Number.isInteger(page) && page > 1 ? page : 1;
};

/** /history: every stuck request, 20 per page, to reopen or delete. */
export const HistoryPage = () => {
  usePageTitle('Stuck history');
  const [searchParams, setSearchParams] = useSearchParams();
  const page = pageFrom(searchParams);
  const query = useStuckHistoryQuery(page);
  // Owned here, not by the table: the table unmounts when its last row goes, and Undo must survive that.
  const remove = useDeleteStuckWithUndo();

  return (
    <div className="wrap pt-8 pb-16">
      <header className="mb-6 flex flex-wrap items-end gap-x-10 gap-y-3 border-b-[3px] border-ink pb-4">
        <div className="mr-auto">
          <h1 className="m-0">Stuck history</h1>
          <p className="m-0 mt-1 text-ink-soft">Every problem you brought here, with its hints, gap and solution.</p>
        </div>
        {query.data && (
          <p className="m-0">
            <span className="label block text-[0.8rem] tracking-[0.1em] text-ink-soft">Total</span>
            <span className="fig text-step-2 leading-none">{query.data.meta.total}</span>
          </p>
        )}
      </header>
      <QueryState
        query={query}
        skeleton={<HistorySkeleton />}
        errorTitle="Your history didn't load"
        errorContext="stuck"
        isEmpty={(answer) => answer.data.length === 0}
        empty={
          <EmptyState
            figure="0"
            title={page > 1 ? 'Nothing on this page' : 'No stuck requests yet'}
            action={
              <Button variant="outline" to={page > 1 ? '/history' : '/stuck'}>
                {page > 1 ? 'Back to the newest' : 'Bring a problem'}
              </Button>
            }
          >
            <p>When a practice problem stops you, bring it here: you get hints first, then the concept you are missing.</p>
          </EmptyState>
        }
      >
        {(answer) => (
          <>
            <HistoryTable items={answer.data} onDelete={remove} />
            <Pager
              label="History pages"
              page={page}
              totalPages={answer.meta.totalPages}
              previous="Newer"
              next="Older"
              onChange={(next) => setSearchParams(next > 1 ? { page: String(next) } : {})}
            />
          </>
        )}
      </QueryState>
    </div>
  );
};
