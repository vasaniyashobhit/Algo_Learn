import { Skeleton } from '../ui/Skeleton.jsx';

/** Shown while /auth/me loads on a protected page: same column and rhythm as a real page. */
export const PageSkeleton = () => (
  <div className="wrap py-6" role="status" aria-label="Loading your account">
    <Skeleton className="mb-6 h-12 w-72" />
    <div className="grid gap-px sm:grid-cols-4">
      {[0, 1, 2, 3].map((key) => (
        <Skeleton key={key} className="h-24" />
      ))}
    </div>
    <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_1fr]">
      <Skeleton className="h-80" />
      <div className="grid content-start gap-3">
        {[0, 1, 2, 3, 4].map((key) => (
          <Skeleton key={key} className="h-7" />
        ))}
      </div>
    </div>
  </div>
);
