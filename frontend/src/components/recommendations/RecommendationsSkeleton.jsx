import { Skeleton } from '../ui/Skeleton.jsx';

const TOPICS = [0, 1, 2];
const PROBLEMS = [0, 1, 2];

/** Same layout as the recommendations: three topic rows, each a fact block and problem cards. */
export const RecommendationsSkeleton = () => (
  <div aria-busy="true" aria-label="Loading your next topics" className="grid gap-6">
    {TOPICS.map((topic) => (
      <div key={topic} className="grid gap-px lg:grid-cols-[19rem_1fr]">
        <div className="grid content-start gap-3 bg-band p-5">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-4 w-full" />
        </div>
        <div className="grid gap-px sm:grid-cols-2 xl:grid-cols-3">
          {PROBLEMS.map((problem) => (
            <div key={problem} className="grid gap-2 bg-band p-4">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-5 w-1/2" />
              <Skeleton className="h-8 w-36" />
            </div>
          ))}
        </div>
      </div>
    ))}
  </div>
);
