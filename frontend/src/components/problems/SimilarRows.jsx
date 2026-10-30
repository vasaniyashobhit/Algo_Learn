import { Link } from 'react-router';
import { problemPath, ratingFigure } from '../../lib/problemLinks.js';
import { StaggerItem } from '../motion/StaggerItem.jsx';
import { StaggerList } from '../motion/StaggerList.jsx';
import { AddToPracticeButton } from '../practice/AddToPracticeButton.jsx';

/** A compact list of problems: rating figure, title (to the problem page), id, and "Add to practice". */
export const SimilarRows = ({ items, addedFrom = 'similar', label }) => (
  <StaggerList as="ul" aria-label={label} className="m-0 mt-2 list-none p-0">
    {items.map((problem) => (
      <StaggerItem key={problem.id} className="flex items-center justify-between gap-4 border-b border-line py-[0.6rem]">
        <Link to={problemPath(problem.id)} className="group flex min-w-0 items-center gap-4 no-underline">
          <span className="fig w-[3.4rem] shrink-0 text-[1.8rem] text-plate-text">
            {ratingFigure(problem.rating)}
            {!Number.isFinite(problem.rating) && <span className="sr-only">Unrated</span>}
          </span>
          <span className="min-w-0">
            <b className="block font-display text-[1.1rem] leading-[1.1] uppercase group-hover:underline">{problem.title}</b>
            <span className="num text-step--1 text-ink-soft">{problem.id}</span>
          </span>
        </Link>
        <AddToPracticeButton problem={problem} addedFrom={addedFrom} variant="text" />
      </StaggerItem>
    ))}
  </StaggerList>
);
