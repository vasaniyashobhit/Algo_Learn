import { useState } from 'react';
import { PracticeList } from '../components/practice/PracticeList.jsx';
import { SegmentedControl } from '../components/ui/SegmentedControl.jsx';
import { usePracticeQuery } from '../hooks/queries/practice.queries.js';
import { usePageTitle } from '../hooks/usePageTitle.js';

const FILTERS = [
  { value: null, label: 'All' },
  { value: 'todo', label: 'To do' },
  { value: 'solved', label: 'Solved' },
  { value: 'skipped', label: 'Skipped' },
];

const countBy = (items = []) => Object.groupBy(items, (item) => item.status);

/** The number shown on a filter button; undefined while the list is loading. */
const countFor = (filter, list) => {
  if (!list) return undefined;
  return filter.value ? (countBy(list.data)[filter.value]?.length ?? 0) : list.data.length;
};

/** /practice: the user's queue with a status filter. Counts come from the unfiltered list. */
export const PracticePage = () => {
  usePageTitle('Practice list');
  const [status, setStatus] = useState(null);
  const all = usePracticeQuery(null);
  const options = FILTERS.map((filter) => ({ ...filter, count: countFor(filter, all.data) }));

  return (
    <div className="wrap pt-8 pb-16">
      <header className="mb-6 flex flex-wrap items-end gap-x-10 gap-y-4">
        <div className="mr-auto">
          <h1 className="m-0">Practice list</h1>
          <p className="m-0 mt-1 text-ink-soft">Problems you queued to solve or upsolve. Mark them as you go.</p>
        </div>
        <SegmentedControl label="Show" options={options} value={status} onChange={setStatus} />
      </header>
      <PracticeList status={status} />
    </div>
  );
};
