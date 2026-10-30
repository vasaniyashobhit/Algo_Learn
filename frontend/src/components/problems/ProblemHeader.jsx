import { codeforcesUrl, ratingFigure } from '../../lib/problemLinks.js';
import { Button } from '../ui/Button.jsx';
import { Tag } from '../ui/Tag.jsx';

/** The chalk strap over a problem: id, title, topics, rating and a link to the original. */
export const ProblemHeader = ({ problem }) => (
  <section aria-label="Problem" className="on-chalk bg-chalk pt-[1.6rem] pb-[1.4rem] text-chalk-ink">
    <div className="wrap grid grid-cols-[1fr_auto] items-end gap-x-8 gap-y-3">
      <div className="min-w-0">
        <p className="num m-0">{problem.id}</p>
        <h1 className="m-0 mt-1 text-[clamp(2rem,4vw,3rem)]">{problem.title}</h1>
      </div>
      <p className="m-0 row-span-2 text-right">
        <span className="fig block text-[clamp(3rem,6vw,5.6rem)] leading-[0.85]">{ratingFigure(problem.rating)}</span>
        <span className="label text-[0.75rem]">{Number.isFinite(problem.rating) ? 'Rating' : 'Unrated'}</span>
      </p>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        {problem.tags.length > 0 ? (
          <ul aria-label="Topics" className="m-0 flex list-none flex-wrap gap-1 p-0">
            {problem.tags.map((tag) => (
              <li key={tag}>
                <Tag>{tag}</Tag>
              </li>
            ))}
          </ul>
        ) : (
          <p className="m-0 text-step--1">No topics tagged on Codeforces.</p>
        )}
        <Button variant="chalkText" href={codeforcesUrl(problem)} target="_blank" rel="noopener noreferrer">
          Open on Codeforces <span aria-hidden="true">↗</span>
          <span className="sr-only">(new tab)</span>
        </Button>
      </div>
    </div>
  </section>
);
