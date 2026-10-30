import { useSearchParams } from 'react-router';
import { ProblemFilters } from '../components/problems/ProblemFilters.jsx';
import { ProblemTable } from '../components/problems/ProblemTable.jsx';
import { ProblemTableSkeleton } from '../components/problems/ProblemTableSkeleton.jsx';
import { Button } from '../components/ui/Button.jsx';
import { EmptyState } from '../components/ui/EmptyState.jsx';
import { Pager } from '../components/ui/Pager.jsx';
import { QueryState } from '../components/ui/QueryState.jsx';
import { useProblemsQuery } from '../hooks/queries/problems.queries.js';
import { usePageTitle } from '../hooks/usePageTitle.js';
import { readFilters, setFilter, toQueryParams, toSearch } from '../lib/problemFilters.js';

/** /problems: browse the problem set by topic and rating. Filters and page live in the URL. */
export const ProblemsPage = () => {
  usePageTitle('Problems');
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = readFilters(searchParams);
  const query = useProblemsQuery(toQueryParams(filters));
  const update = (next) => setSearchParams(toSearch(next));
  const reset = () => setSearchParams({});

  return (
    <div className="wrap pt-8 pb-16">
      <header className="mb-6 flex flex-wrap items-end gap-x-10 gap-y-5 border-b-[3px] border-ink pb-5">
        <div className="mr-auto">
          <h1 className="m-0">Problems</h1>
          <p className="m-0 mt-1 text-ink-soft">
            {query.data ? `${query.data.meta.total.toLocaleString('en-IN')} problems` : 'The whole problem set'}, newest
            contest first.
          </p>
        </div>
        <ProblemFilters filters={filters} onChange={(key, value) => update(setFilter(filters, key, value))} onReset={reset} />
      </header>
      <QueryState
        query={query}
        skeleton={<ProblemTableSkeleton />}
        errorTitle="Problems didn't load"
        isEmpty={(answer) => answer.data.length === 0}
        empty={
          <EmptyState
            figure="0"
            title="No problems match"
            action={
              <Button variant="outline" onClick={reset}>
                Clear filters
              </Button>
            }
          >
            <p>Try a wider rating range or another topic.</p>
          </EmptyState>
        }
      >
        {(answer) => (
          <div aria-busy={query.isPlaceholderData || undefined} className={query.isPlaceholderData ? 'opacity-60' : undefined}>
            <ProblemTable problems={answer.data} />
            <Pager
              label="Problem pages"
              page={filters.page}
              totalPages={answer.meta.totalPages}
              onChange={(page) => update({ ...filters, page })}
            />
          </div>
        )}
      </QueryState>
    </div>
  );
};
