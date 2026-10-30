import { usePracticeQuery } from '../../hooks/queries/practice.queries.js';
import { StaggerList } from '../motion/StaggerList.jsx';
import { Mark } from '../ui/Mark.jsx';
import { QueryState } from '../ui/QueryState.jsx';
import { PracticeEmpty } from './PracticeEmpty.jsx';
import { PracticeRow } from './PracticeRow.jsx';
import { PracticeSkeleton } from './PracticeSkeleton.jsx';

const HEAD = 'label border-b-[3px] border-ink px-2 pb-2 text-left text-[0.8rem] tracking-[0.1em] text-ink-soft';

const PracticeTable = ({ items }) => (
  <>
    <table className="w-full border-collapse">
      <caption className="sr-only">Your practice list, newest first</caption>
      <thead>
        <tr>
          <th scope="col" className={HEAD}>
            <span className="sr-only">Status</span>
          </th>
          <th scope="col" className={HEAD}>
            Rating
          </th>
          <th scope="col" className={HEAD}>
            Problem
          </th>
          <th scope="col" className={HEAD}>
            Topics
          </th>
          <th scope="col" className={HEAD}>
            Added from
          </th>
          <th scope="col" className={HEAD}>
            <span className="sr-only">Actions</span>
          </th>
        </tr>
      </thead>
      <StaggerList as="tbody">
        {items.map((item) => (
          <PracticeRow key={item.problemId} item={item} />
        ))}
      </StaggerList>
    </table>
    <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-step--1 text-ink-soft">
      <span className="flex items-center gap-2"><Mark shape="open" /> to do</span>
      <span className="flex items-center gap-2"><Mark shape="solved" /> solved</span>
      <span className="flex items-center gap-2"><Mark shape="skipped" /> skipped</span>
    </p>
  </>
);

/** The practice items for one status filter (null = all). */
export const PracticeList = ({ status }) => {
  const query = usePracticeQuery(status);
  return (
    <QueryState
      query={query}
      skeleton={<PracticeSkeleton />}
      errorTitle="Your practice list didn't load"
      errorContext="practice"
      isEmpty={(answer) => answer.data.length === 0}
      empty={<PracticeEmpty status={status} />}
    >
      {(answer) => <PracticeTable items={answer.data} />}
    </QueryState>
  );
};
