import { Skeleton } from '../ui/Skeleton.jsx';

const ROWS = [0, 1, 2, 3, 4];

/** Same columns as the history table: when, problem, input, answer, gap, delete. */
export const HistorySkeleton = () => (
  <div aria-busy="true" aria-label="Loading your history" className="grid">
    <div className="border-b-[3px] border-line pb-2">
      <Skeleton className="h-3 w-56" />
    </div>
    {ROWS.map((row) => (
      <div key={row} className="grid grid-cols-[8rem_1fr_6rem_8rem_10rem_4rem] items-center gap-3 border-b border-line px-2 py-[0.8rem]">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-5 w-2/3" />
        <Skeleton className="h-4 w-14" />
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-4 w-12" />
      </div>
    ))}
  </div>
);
