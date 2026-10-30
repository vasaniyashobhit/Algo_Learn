import { useId } from 'react';
import { cn } from '../../lib/cn.js';

const FIELD =
  'w-full rounded-none border-0 border-b-2 border-line bg-band-2 px-[0.85rem] py-[0.7rem] text-ink ' +
  'placeholder:text-ink-soft focus-visible:border-plate focus-visible:outline-none ' +
  'aria-[invalid=true]:border-miss';

/** A labelled text field with optional hint and inline error (linked by aria-describedby). */
export const Input = ({ label, error, hint, id, className, ref, ...props }) => {
  const autoId = useId();
  const inputId = id ?? autoId;
  const hintId = hint ? `${inputId}-hint` : undefined;
  const errorId = error ? `${inputId}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={cn('mb-4 grid gap-[0.35rem]', className)}>
      <label htmlFor={inputId} className="label text-ink-soft">
        {label}
      </label>
      <input
        ref={ref}
        id={inputId}
        className={FIELD}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={describedBy}
        {...props}
      />
      {hint && (
        <p id={hintId} className="m-0 text-step--1 text-ink-soft">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="m-0 text-step--1 text-miss">
          {error}
        </p>
      )}
    </div>
  );
};
