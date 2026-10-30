import { Skeleton } from '../ui/Skeleton.jsx';

const ROWS = Array.from({ length: 8 }, (_, row) => row);

/** Skeleton rows in the problem table's columns: rating, problem, topics, action. */
export const ProblemTableSkeleton = () => (
  <div aria-busy="true" aria-label="Loading problems" className="grid">
    <div className="border-b-[3px] border-line pb-2">
      <Skeleton className="h-3 w-40" />
    </div>
    {ROWS.map((row) => (
      <div key={row} className="grid grid-cols-[5rem_1fr_14rem_9rem] items-center gap-3 border-b border-line px-2 py-[0.8rem]">
        <Skeleton className="h-7 w-14" />
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-5 w-full" />
      </div>
    ))}
  </div>
);
