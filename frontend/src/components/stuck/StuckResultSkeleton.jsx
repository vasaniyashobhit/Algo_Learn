import { Skeleton } from '../ui/Skeleton.jsx';

const HINTS = [0, 1, 2];
const GAPS = [0, 1, 2];

/** Same layout as a stuck result: the chalk strap, three hint rows, the gap panel and similar rows. */
export const StuckResultSkeleton = () => (
  <div aria-busy="true" aria-label="Loading your stuck result">
    <div className="bg-band-2 pt-[1.6rem] pb-[1.4rem]">
      <div className="wrap grid grid-cols-[1fr_auto] items-end gap-x-8 gap-y-3">
        <div className="grid gap-2">
          <Skeleton className="h-4 w-44" />
          <Skeleton className="h-11 w-3/4" />
          <Skeleton className="h-5 w-56" />
        </div>
        <Skeleton className="h-20 w-36" />
      </div>
    </div>
    <div className="wrap grid items-start gap-10 pt-8 pb-16 lg:grid-cols-[1.4fr_1fr]">
      <div className="grid gap-[0.6rem]">
        <Skeleton className="mb-2 h-5 w-24" />
        {HINTS.map((hint) => (
          <Skeleton key={hint} className="h-16 w-full" />
        ))}
        <Skeleton className="mt-2 h-10 w-44" />
      </div>
      <div className="grid gap-4">
        <div className="grid grid-cols-3 gap-px">
          {GAPS.map((gap) => (
            <Skeleton key={gap} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    </div>
  </div>
);
