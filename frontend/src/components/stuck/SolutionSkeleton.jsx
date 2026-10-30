import { Skeleton } from '../ui/Skeleton.jsx';

/** Same layout as the solution: a caption, the approach lines, then a code block. */
export const SolutionSkeleton = () => (
  <div aria-busy="true" aria-label="Loading the solution" className="grid gap-3">
    <Skeleton className="h-3 w-48" />
    <Skeleton className="h-4 w-24" />
    <Skeleton className="h-4 w-full" />
    <Skeleton className="h-4 w-5/6" />
    <Skeleton className="h-4 w-2/3" />
    <Skeleton className="mt-2 h-32 w-full" />
  </div>
);
