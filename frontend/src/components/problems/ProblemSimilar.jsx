import { useSimilarQuery } from '../../hooks/queries/problems.queries.js';
import { STRATEGY_LABELS } from '../../lib/stuckLabels.js';
import { QueryState } from '../ui/QueryState.jsx';
import { Skeleton } from '../ui/Skeleton.jsx';
import { SimilarRows } from './SimilarRows.jsx';

const PARAMS = { k: 8 };
const ROWS = [0, 1, 2, 3, 4];

const RowsSkeleton = () => (
  <div aria-busy="true" aria-label="Loading similar problems" className="mt-2 grid">
    {ROWS.map((row) => (
      <div key={row} className="flex items-center gap-4 border-b border-line py-[0.7rem]">
        <Skeleton className="h-7 w-12" />
        <Skeleton className="h-5 flex-1" />
        <Skeleton className="h-5 w-16" />
      </div>
    ))}
  </div>
);

/** Similar problems beside the statement, with how they were matched in small print. */
export const ProblemSimilar = ({ problemId }) => {
  const query = useSimilarQuery(problemId, PARAMS);
  return (
    <aside aria-labelledby="similar-title">
      <h2 id="similar-title" className="text-ink-soft">
        Similar problems
      </h2>
      <p className="m-0 text-step--1 text-ink-soft">Shared topics first, then rating closeness.</p>
      <QueryState
        query={query}
        skeleton={<RowsSkeleton />}
        errorTitle="Similar problems didn't load"
        isEmpty={(answer) => answer.data.length === 0}
        empty={<p className="mt-3 text-ink-soft">We have no other problems to compare with yet.</p>}
      >
        {(answer) => (
          <>
            <SimilarRows items={answer.data} addedFrom="similar" label="Similar problems" />
            <p className="mt-3 mb-0 text-step--1 text-ink-soft">
              Matched by {STRATEGY_LABELS[answer.meta.strategy] ?? 'topics and rating'}.
            </p>
          </>
        )}
      </QueryState>
    </aside>
  );
};
