import { cn } from '../../lib/cn.js';
import { STUCK_LIMITS } from '../../lib/stuckInput.js';

const FIELD =
  'stuck-textarea w-full rounded-none border-0 border-b-2 border-line bg-band-2 px-[0.85rem] py-[0.7rem] text-ink ' +
  'placeholder:text-ink-soft focus-visible:border-plate focus-visible:outline-none aria-[invalid=true]:border-miss';

/** The pasted statement, with a live character count against the 20,000 limit. */
export const TextPanel = ({ value, onChange, invalid, describedBy }) => {
  const length = value.trim().length;
  const short = length > 0 && length < STUCK_LIMITS.minText;
  return (
    <div className="grid gap-[0.35rem]">
      <label htmlFor="stuck-text" className="label text-ink-soft">
        Problem statement
      </label>
      <textarea
        id="stuck-text"
        className={FIELD}
        value={value}
        maxLength={STUCK_LIMITS.maxText}
        placeholder="Paste the whole statement: story, input, output and constraints."
        aria-invalid={invalid ? 'true' : undefined}
        aria-describedby={cn('stuck-text-count', describedBy) || undefined}
        onChange={(event) => onChange(event.target.value)}
      />
      <p id="stuck-text-count" className="m-0 flex justify-between gap-4 text-step--1 text-ink-soft">
        <span>{short ? `At least ${STUCK_LIMITS.minText} characters, so we can match it.` : 'Raw text is fine; we read the LaTeX.'}</span>
        <span className="num shrink-0">
          {value.length.toLocaleString('en-IN')} / {STUCK_LIMITS.maxText.toLocaleString('en-IN')}
        </span>
      </p>
    </div>
  );
};
