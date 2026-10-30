import { useId } from 'react';
import { cn } from '../../lib/cn.js';

const FIELD =
  'w-full rounded-none border-0 border-b-2 border-line bg-band-2 px-[0.85rem] py-[0.7rem] text-ink ' +
  'placeholder:text-ink-soft focus-visible:outline-none';

// tone "plate" sits on the yellow plate: Plate Ink for the label, the focus rule and errors,
// because plate yellow and Miss Orange both vanish there. Errors keep a × so hue is not the signal.
const TONES = {
  default: {
    field: 'focus-visible:border-plate aria-[invalid=true]:border-miss',
    label: 'text-ink-soft',
    hint: 'text-ink-soft',
    error: 'text-miss',
  },
  plate: {
    field: 'border-plate-ink/40 focus-visible:border-plate-ink aria-[invalid=true]:border-plate-ink',
    label: 'text-plate-ink',
    hint: 'text-plate-ink',
    error: 'font-semibold text-plate-ink',
  },
};

/** A labelled text field with optional hint and inline error (linked by aria-describedby). */
export const Input = ({ label, error, hint, id, tone = 'default', className, ref, ...props }) => {
  const autoId = useId();
  const inputId = id ?? autoId;
  const hintId = hint ? `${inputId}-hint` : undefined;
  const errorId = error ? `${inputId}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;
  const styles = TONES[tone] ?? TONES.default;

  return (
    <div className={cn('mb-4 grid gap-[0.35rem]', className)}>
      <label htmlFor={inputId} className={cn('label', styles.label)}>
        {label}
      </label>
      <input
        ref={ref}
        id={inputId}
        className={cn(FIELD, styles.field)}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={describedBy}
        {...props}
      />
      {hint && (
        <p id={hintId} className={cn('m-0 text-step--1', styles.hint)}>
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className={cn('m-0 text-step--1', styles.error)}>
          {tone === 'plate' && <span aria-hidden="true">× </span>}
          {error}
        </p>
      )}
    </div>
  );
};
