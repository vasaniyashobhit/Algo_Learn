import { useParams } from 'react-router';
import { ProblemDetailSkeleton } from '../components/problems/ProblemDetailSkeleton.jsx';
import { ProblemHeader } from '../components/problems/ProblemHeader.jsx';
import { ProblemSimilar } from '../components/problems/ProblemSimilar.jsx';
import { ProblemStatement } from '../components/problems/ProblemStatement.jsx';
import { Button } from '../components/ui/Button.jsx';
import { ErrorState } from '../components/ui/ErrorState.jsx';
import { getUserMessage, isUnexpectedError } from '../errors/getUserMessage.js';
import { useProblemQuery } from '../hooks/queries/problems.queries.js';
import { usePageTitle } from '../hooks/usePageTitle.js';

/** /problems/:contestId/:index: the statement, practice actions and similar problems. */
export const ProblemPage = () => {
  const { contestId, index } = useParams();
  const problemId = `${contestId}/${index.toUpperCase()}`;
  const query = useProblemQuery(problemId);
  usePageTitle(query.data ? `${problemId} ${query.data.title}` : problemId);

  if (query.isPending) return <ProblemDetailSkeleton />;
  if (query.isError) {
    const { error } = query;
    const missing = error?.code === 'PROBLEM_NOT_FOUND';
    return (
      <div className="wrap pt-8 pb-16">
        <ErrorState
          title={missing ? 'Problem not found' : "This problem didn't load"}
          message={getUserMessage(error, 'problem', { problemId })}
          requestId={isUnexpectedError(error) ? error?.requestId : undefined}
          onRetry={missing ? undefined : () => query.refetch()}
          action={
            <Button variant="outline" to="/problems">
              Browse problems
            </Button>
          }
        />
      </div>
    );
  }
  return (
    <>
      <ProblemHeader problem={query.data} />
      <div className="wrap grid items-start gap-10 pt-8 pb-16 lg:grid-cols-[1.4fr_1fr]">
        <ProblemStatement problem={query.data} />
        <ProblemSimilar problemId={problemId} />
      </div>
    </>
  );
};
