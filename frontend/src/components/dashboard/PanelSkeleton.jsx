import { Skeleton } from '../ui/Skeleton.jsx';

const ROWS = [0, 1, 2, 3, 4];

/** The loading shape of a dashboard panel: a heading, then a wheel or five rows. */
export const PanelSkeleton = ({ label, shape = 'rows' }) => (
  <div aria-busy="true" aria-label={label} className="grid gap-3">
    <Skeleton className="h-6 w-40" />
    {shape === 'wheel' ? (
      <Skeleton className="mx-auto my-3 aspect-square w-4/5 rounded-full" />
    ) : (
      ROWS.map((row) => <Skeleton key={row} className="h-7 w-full" />)
    )}
  </div>
);
