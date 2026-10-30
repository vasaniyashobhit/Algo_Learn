import { codeforcesUrl, ratingText, similarPath } from '../../lib/problemLinks.js';
import { AddToPracticeButton } from '../practice/AddToPracticeButton.jsx';
import { Button } from '../ui/Button.jsx';
import { Tag } from '../ui/Tag.jsx';

/**
 * A problem: id, title, rating, tags and three actions (open on Codeforces, find similar,
 * add to practice). `note` is a short qualifier such as "Broader pick".
 */
export const ProblemCard = ({ problem, note, addedFrom }) => (
  <article
    aria-labelledby={`problem-${problem.id}`}
    className="grid h-full content-start gap-2 bg-band p-4 shadow-[inset_0_-3px_0_var(--line)] transition-shadow duration-[160ms] hover:shadow-[inset_0_-3px_0_var(--plate-text)]"
  >
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="num m-0 text-step--1 text-ink-soft">
          {problem.id}
          {note && <span> · {note}</span>}
        </p>
        <h3 id={`problem-${problem.id}`} className="m-0 text-[1.4rem] leading-none">
          {problem.title}
        </h3>
      </div>
      <p className="m-0 text-right">
        <span className="fig block text-[2rem] leading-none text-plate-text">{ratingText(problem.rating)}</span>
        <span className="label text-[0.7rem] text-ink-soft">Rating</span>
      </p>
    </div>
    {problem.tags?.length > 0 && (
      <ul aria-label="Topics" className="m-0 flex list-none flex-wrap gap-1 p-0">
        {problem.tags.map((tag) => (
          <li key={tag}>
            <Tag>{tag}</Tag>
          </li>
        ))}
      </ul>
    )}
    <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-2">
      <AddToPracticeButton problem={problem} addedFrom={addedFrom} />
      <Button variant="text" to={similarPath(problem.id)} aria-label={`Find problems similar to ${problem.id}`}>
        Find similar
      </Button>
      <Button variant="text" href={codeforcesUrl(problem)} target="_blank" rel="noopener noreferrer">
        Codeforces <span aria-hidden="true">↗</span>
        <span className="sr-only">(opens {problem.id} in a new tab)</span>
      </Button>
    </div>
  </article>
);
