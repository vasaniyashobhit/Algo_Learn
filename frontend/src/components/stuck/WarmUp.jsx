import { isBroader } from '../../lib/stuckLabels.js';
import { SimilarRows } from '../problems/SimilarRows.jsx';

/** Similar problems from the stuck result; easier ones on the gap topics when `easier`. */
export const WarmUp = ({ similar }) => {
  const items = similar?.items ?? [];
  const title = similar?.easier ? 'Warm up on the gap' : 'Similar problems';
  return (
    <section aria-labelledby="warmup-title">
      <h2 id="warmup-title" className="text-ink-soft">
        {title}
      </h2>
      <p className="m-0 text-step--1 text-ink-soft">
        {similar?.easier
          ? `A little easier, around ${similar.targetRating}, on the topics you are missing. Solve one, then come back.`
          : 'Same topics, close in rating.'}
        {isBroader(similar?.strategies) && ' Few close matches exist, so some of these are broader picks.'}
      </p>
      {items.length > 0 ? (
        <SimilarRows items={items} addedFrom="stuck" label={title} />
      ) : (
        <p className="mt-3 text-ink-soft">We have no similar problems for this one yet. The problem browser has more.</p>
      )}
    </section>
  );
};
