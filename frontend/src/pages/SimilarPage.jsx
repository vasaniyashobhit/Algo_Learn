import { useParams } from 'react-router';
import { ProblemCard } from '../components/problems/ProblemCard.jsx';
import { StaggerItem } from '../components/motion/StaggerItem.jsx';
import { StaggerList } from '../components/motion/StaggerList.jsx';
import { RecommendationsSkeleton } from '../components/recommendations/RecommendationsSkeleton.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Notice } from '../components/ui/Notice.jsx';
import { QueryState } from '../components/ui/QueryState.jsx';
import { useSimilarQuery } from '../hooks/queries/problems.queries.js';
import { usePageTitle } from '../hooks/usePageTitle.js';

const isBroader = (meta) => (meta.strategies ?? []).some((strategy) => strategy !== 'primary');

const SimilarResults = ({ answer }) => (
  <>
    <h1 className="m-0">Similar to {answer.meta.problem?.title ?? 'this problem'}</h1>
    <p className="mt-1 text-ink-soft">Same topics, close in rating. Good for practice and upsolving.</p>
    {isBroader(answer.meta) && (
      <Notice className="mb-5">
        <p>Few close matches exist, so some of these share fewer topics or sit further from the rating.</p>
      </Notice>
    )}
    <StaggerList as="ul" className="m-0 grid list-none gap-px bg-line p-0 sm:grid-cols-2 xl:grid-cols-3">
      {answer.data.map((problem) => (
        <StaggerItem key={problem.id} className="bg-ground">
          <ProblemCard problem={problem} addedFrom="similar" />
        </StaggerItem>
      ))}
    </StaggerList>
  </>
);

/** /problems/:contestId/:index/similar: the "Find similar" results for one problem. */
export const SimilarPage = () => {
  const { contestId, index } = useParams();
  const problemId = `${contestId}/${index}`;
  usePageTitle(`Similar to ${problemId}`);
  const query = useSimilarQuery(problemId);

  return (
    <div className="wrap pt-8 pb-16">
      <QueryState
        query={query}
        skeleton={<RecommendationsSkeleton />}
        errorTitle={`We couldn't find problems similar to ${problemId}`}
        isEmpty={(answer) => answer.data.length === 0}
        empty={<p className="text-ink-soft">We have no other problems to compare with yet.</p>}
      >
        {(answer) => <SimilarResults answer={answer} />}
      </QueryState>
      <Button variant="text" to="/dashboard" className="mt-6">
        Back to the dashboard
      </Button>
    </div>
  );
};
