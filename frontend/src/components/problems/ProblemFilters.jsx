import { useTagsQuery } from '../../hooks/queries/meta.queries.js';
import { hasFilters, RATING_OPTIONS } from '../../lib/problemFilters.js';
import { Button } from '../ui/Button.jsx';

const SELECT =
  'w-full rounded-none border-0 border-b-2 border-line bg-band-2 px-[0.75rem] py-[0.6rem] text-ink ' +
  'focus-visible:border-plate focus-visible:outline-none';

const Field = ({ id, label, value, onChange, children }) => (
  <div className="grid min-w-[9rem] gap-[0.35rem]">
    <label htmlFor={id} className="label text-ink-soft">
      {label}
    </label>
    <select id={id} className={SELECT} value={value ?? ''} onChange={(event) => onChange(event.target.value || null)}>
      {children}
    </select>
  </div>
);

const RatingOptions = ({ any }) => (
  <>
    <option value="">{any}</option>
    {RATING_OPTIONS.map((rating) => (
      <option key={rating} value={rating}>
        {rating}
      </option>
    ))}
  </>
);

/** Topic and rating range for the problem browser. Every change applies at once. */
export const ProblemFilters = ({ filters, onChange, onReset }) => {
  const tags = useTagsQuery();
  const topics = tags.data?.topicTags ?? [];
  const toRating = (value) => (value ? Number(value) : null);
  return (
    <div role="search" aria-label="Filter problems" className="flex flex-wrap items-end gap-4">
      <Field id="filter-tag" label="Topic" value={filters.tag} onChange={(value) => onChange('tag', value)}>
        <option value="">Any topic</option>
        {topics.map((tag) => (
          <option key={tag} value={tag}>
            {tag}
          </option>
        ))}
      </Field>
      <Field id="filter-min" label="Rating from" value={filters.minRating} onChange={(value) => onChange('minRating', toRating(value))}>
        <RatingOptions any="Any" />
      </Field>
      <Field id="filter-max" label="Rating to" value={filters.maxRating} onChange={(value) => onChange('maxRating', toRating(value))}>
        <RatingOptions any="Any" />
      </Field>
      {hasFilters(filters) && (
        <Button variant="text" onClick={onReset}>
          Clear filters
        </Button>
      )}
    </div>
  );
};
