import { StaggerList } from '../motion/StaggerList.jsx';
import { PROBLEM_HEAD } from '../problems/ProblemTable.jsx';
import { HistoryRow } from './HistoryRow.jsx';

const COLUMNS = ['When', 'Problem', 'Input', 'Answer', 'Gap'];

/** Past stuck queries, newest first. `onDelete(item)` removes a row (the page owns the Undo flow). */
export const HistoryTable = ({ items, onDelete }) => (
  <div className="scroll-x">
    <table className="w-full min-w-[46rem] border-collapse">
      <caption className="sr-only">Your stuck requests, newest first</caption>
      <thead>
        <tr>
          {COLUMNS.map((column) => (
            <th key={column} scope="col" className={PROBLEM_HEAD}>
              {column}
            </th>
          ))}
          <th scope="col" className={PROBLEM_HEAD}>
            <span className="sr-only">Actions</span>
          </th>
        </tr>
      </thead>
      <StaggerList as="tbody">
        {items.map((item) => (
          <HistoryRow key={item.id} item={item} onDelete={onDelete} />
        ))}
      </StaggerList>
    </table>
  </div>
);
