import { useId, useState } from 'react';
import { useStatsSummaryQuery } from '../../hooks/queries/stats.queries.js';
import { activityTotals, bestDayValue, toOvers } from '../../lib/overs.js';
import { Wipe } from '../motion/Wipe.jsx';
import { PanelHeading } from '../ui/PanelHeading.jsx';
import { QueryState } from '../ui/QueryState.jsx';
import { Skeleton } from '../ui/Skeleton.jsx';
import { TableToggle } from '../ui/TableToggle.jsx';
import { ActivityTable } from './ActivityTable.jsx';
import { Over } from './Over.jsx';

const summaryLine = ({ accepted, activeDays }) =>
  activeDays === 0
    ? 'No submissions in the last 30 days. A quiet stretch is fine: pick a problem from Next topics below.'
    : `${accepted} accepted over ${activeDays} active day${activeDays === 1 ? '' : 's'}. Number = accepted that day, W = tried but nothing accepted, dot = no submissions.`;

const Strip = ({ activity }) => {
  const tableId = useId();
  const [showTable, setShowTable] = useState(false);
  const best = bestDayValue(activity);
  return (
    <>
      <PanelHeading
        id="activity-title"
        title="Last 30 days"
        caption="Ball by ball · 5 overs"
        action={<TableToggle showTable={showTable} controls={tableId} onToggle={() => setShowTable((v) => !v)} />}
      />
      <Wipe hidden={showTable} aria-hidden="true" className="mb-3 flex flex-wrap gap-4">
        {toOvers(activity).map((balls) => (
          <Over key={balls[0].date} balls={balls} best={best} />
        ))}
      </Wipe>
      <ActivityTable id={tableId} activity={activity} hidden={!showTable} />
      <p className="mt-3 mb-0 text-step--1 text-ink-soft">{summaryLine(activityTotals(activity))}</p>
    </>
  );
};

const StripSkeleton = () => (
  <div aria-busy="true" aria-label="Loading the last 30 days" className="grid gap-3">
    <Skeleton className="h-6 w-48" />
    <Skeleton className="h-8 w-full max-w-[52rem]" />
  </div>
);

/** The last 30 days, oldest first, as five overs of six balls. */
export const ActivityStrip = () => {
  const query = useStatsSummaryQuery();
  return (
    <section aria-labelledby="activity-title" className="mt-10">
      <QueryState query={query} skeleton={<StripSkeleton />} errorTitle="Your last 30 days didn't load">
        {(answer) => <Strip activity={answer.data.activity} />}
      </QueryState>
    </section>
  );
};
