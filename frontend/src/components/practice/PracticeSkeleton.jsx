import { Skeleton } from '../ui/Skeleton.jsx';

const ROWS = [0, 1, 2, 3, 4];

/** Same layout as the practice table: mark, rating, problem, topics, source, actions. */
export const PracticeSkeleton = () => (
  <div aria-busy="true" aria-label="Loading your practice list" className="grid gap-px">
    {ROWS.map((row) => (
      <div key={row} className="grid grid-cols-[1.5rem_4rem_1fr_10rem_6rem_12rem] items-center gap-3 border-b border-line py-3">
        <Skeleton className="size-3" />
        <Skeleton className="h-7 w-14" />
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-8 w-full" />
      </div>
    ))}
  </div>
);
