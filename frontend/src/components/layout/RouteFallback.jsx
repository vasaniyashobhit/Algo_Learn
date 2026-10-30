import { Skeleton } from '../ui/Skeleton.jsx';

/**
 * Suspense fallback while a page's code chunk loads: the page column with a title bar and the
 * page's own content skeleton (`children`), so the layout does not jump when the page arrives.
 */
export const RouteFallback = ({ children }) => (
  <div className="wrap pt-8 pb-16" role="status" aria-label="Loading page">
    <Skeleton className="mb-6 h-12 w-72 max-w-full" />
    {children}
  </div>
);
