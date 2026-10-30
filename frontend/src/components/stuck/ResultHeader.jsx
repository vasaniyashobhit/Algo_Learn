import { problemPath, ratingFigure } from '../../lib/problemLinks.js';
import { INPUT_FROM, stuckProblemId, stuckTitle, TAG_SOURCE } from '../../lib/stuckLabels.js';
import { Button } from '../ui/Button.jsx';
import { Tag } from '../ui/Tag.jsx';

const DetectedTags = ({ tags, source }) => {
  if (!tags.length) return <p className="m-0 text-step--1">No topics found for this one, so the gap below is a best guess.</p>;
  const badge = TAG_SOURCE[source];
  return (
    <div className="flex flex-wrap items-center gap-2">
      <ul aria-label="Detected topics" className="m-0 flex list-none flex-wrap gap-1 p-0">
        {tags.map((tag) => (
          <li key={tag}>
            <Tag>{tag}</Tag>
          </li>
        ))}
      </ul>
      {badge && (
        <span title={badge.hint} className="label border-[1.5px] border-chalk-ink px-[0.45rem] py-[0.1rem] text-[0.75rem]">
          {badge.label}
          <span className="sr-only">: {badge.hint}</span>
        </span>
      )}
    </div>
  );
};

/** The chalk strap over a stuck result: where the problem came from, its title, rating and detected topics. */
export const ResultHeader = ({ result }) => {
  const { problem, inputType } = result;
  const id = stuckProblemId(problem);
  return (
    <section aria-label="Your problem" className="on-chalk bg-chalk pt-[1.6rem] pb-[1.4rem] text-chalk-ink">
      <div className="wrap grid grid-cols-[1fr_auto] items-end gap-x-8 gap-y-3">
        <div className="min-w-0">
          <p className="num m-0">
            {id ? `${id} · ` : ''}
            {INPUT_FROM[inputType] ?? 'from your input'}
          </p>
          <h1 className="m-0 mt-1 text-[clamp(2rem,4vw,3rem)]">{stuckTitle(problem)}</h1>
        </div>
        <p className="m-0 row-span-2 text-right">
          <span className="fig block text-[clamp(3rem,6vw,5.6rem)] leading-[0.85]">{ratingFigure(problem?.rating)}</span>
          <span className="label text-[0.75rem]">{Number.isFinite(problem?.rating) ? 'Rating' : 'Unrated'}</span>
        </p>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <DetectedTags tags={problem?.tags ?? []} source={problem?.tagsSource} />
          {problem?.matchedProblemId && (
            <Button variant="chalkText" to={problemPath(problem.matchedProblemId)}>
              Open the problem
            </Button>
          )}
        </div>
      </div>
    </section>
  );
};
