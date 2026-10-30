import { Link } from 'react-router';
import { problemPath, ratingFigure } from '../../lib/problemLinks.js';
import { StaggerItem } from '../motion/StaggerItem.jsx';
import { StaggerList } from '../motion/StaggerList.jsx';
import { AddToPracticeButton } from '../practice/AddToPracticeButton.jsx';
import { Tag } from '../ui/Tag.jsx';

export const PROBLEM_HEAD = 'label border-b border-line px-2 pb-2 text-left text-[0.8rem] tracking-[0.1em] text-ink-soft';
const CELL = 'border-b border-line px-2 py-[0.65rem] align-middle';

const COLUMNS = ['Rating', 'Problem', 'Topics'];

/** One page of the problem browser as a table: rating, title (to the problem page), topics, practice. */
export const ProblemTable = ({ problems }) => (
  <table className="w-full border-collapse">
    <caption className="sr-only">Problems, newest contest first</caption>
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
      {problems.map((problem) => (
        <StaggerItem as="tr" key={problem.id}>
          <td className={`${CELL} fig w-[5rem] text-[1.6rem] text-plate-text`}>
            {ratingFigure(problem.rating)}
            {!Number.isFinite(problem.rating) && <span className="sr-only">Unrated</span>}
          </td>
          <td className={CELL}>
            <Link to={problemPath(problem.id)} className="group no-underline">
              <b className="font-display text-[1.15rem] uppercase group-hover:underline">{problem.title}</b>{' '}
              <span className="num text-ink-soft">{problem.id}</span>
            </Link>
          </td>
          <td className={CELL}>
            <span className="flex flex-wrap gap-1">
              {problem.tags.map((tag) => (
                <Tag key={tag}>{tag}</Tag>
              ))}
            </span>
          </td>
          <td className={`${CELL} text-right`}>
            <AddToPracticeButton problem={problem} addedFrom="manual" variant="text" />
          </td>
        </StaggerItem>
      ))}
    </StaggerList>
  </table>
);
