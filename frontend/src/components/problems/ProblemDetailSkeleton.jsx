import { Skeleton } from '../ui/Skeleton.jsx';

const LINES = ['w-full', 'w-11/12', 'w-full', 'w-4/5', 'w-2/3'];

/** Same layout as the problem page: chalk strap, statement panel and the similar list. */
export const ProblemDetailSkeleton = () => (
  <div aria-busy="true" aria-label="Loading the problem">
    <div className="bg-band-2 pt-[1.6rem] pb-[1.4rem]">
      <div className="wrap grid grid-cols-[1fr_auto] items-end gap-8">
        <div className="grid gap-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-11 w-2/3" />
          <Skeleton className="h-5 w-48" />
        </div>
        <Skeleton className="h-20 w-36" />
      </div>
    </div>
    <div className="wrap grid items-start gap-10 pt-8 pb-16 lg:grid-cols-[1.4fr_1fr]">
      <div className="grid gap-3 bg-band px-[1.6rem] py-[1.4rem]">
        <Skeleton className="mb-3 h-10 w-72" />
        {LINES.map((width, index) => (
          <Skeleton key={index} className={`h-4 ${width}`} />
        ))}
      </div>
      <div className="grid gap-3">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    </div>
  </div>
);
