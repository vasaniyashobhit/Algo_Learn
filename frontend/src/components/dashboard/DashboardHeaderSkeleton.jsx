import { Skeleton } from '../ui/Skeleton.jsx';

const TILES = ['rating', 'solved', 'notSolved', 'active', 'topics'];

/** Same layout as DashboardHeader: handle and sync line, five figures, two controls. */
export const DashboardHeaderSkeleton = () => (
  <section aria-busy="true" aria-label="Loading your scoreboard" className="bg-band">
    <div className="wrap flex flex-wrap items-end gap-x-10 gap-y-5 py-6">
      <div className="mr-auto grid gap-2">
        <Skeleton className="h-12 w-56" />
        <Skeleton className="h-4 w-44" />
      </div>
      <div className="flex flex-wrap gap-x-9 gap-y-4">
        {TILES.map((key) => (
          <div key={key} className="grid gap-2">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-11 w-20" />
          </div>
        ))}
      </div>
      <Skeleton className="h-10 w-36" />
    </div>
  </section>
);
