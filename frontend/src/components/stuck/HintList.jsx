import { useEffect, useRef, useState } from 'react';
import { Wipe } from '../motion/Wipe.jsx';
import { Button } from '../ui/Button.jsx';
import { Markdown } from '../ui/Markdown.jsx';

const Hint = ({ number, text, reveal }) => {
  const ref = useRef(null);
  // A newly revealed hint takes focus, so keyboard and screen-reader users land on it.
  useEffect(() => {
    if (reveal) ref.current?.focus();
  }, [reveal]);
  const itemProps = {
    ref,
    tabIndex: reveal ? -1 : undefined,
    className:
      'grid grid-cols-[3rem_1fr] gap-[0.6rem] bg-band px-[1.1rem] py-4 outline-none focus-visible:shadow-[inset_0_0_0_2px_var(--focus)]',
  };
  const content = (
    <>
      <span className="fig text-[2.6rem] leading-[0.9] text-plate-text" aria-hidden="true">
        {number}
      </span>
      <div>
        <span className="sr-only">Hint {number}: </span>
        <Markdown className="text-step-lead">{text}</Markdown>
      </div>
    </>
  );
  return reveal ? (
    <Wipe as="li" {...itemProps}>
      {content}
    </Wipe>
  ) : (
    <li {...itemProps}>{content}</li>
  );
};

/**
 * Hints one at a time: the first is shown, "Next hint" reveals the next (wiping in from the
 * left). `plate` makes the button the screen's primary action; `actions` share its row.
 */
export const HintList = ({ hints, plate = true, actions }) => {
  const [shown, setShown] = useState(1);
  const left = hints.length - shown;
  return (
    <>
      <ol aria-label="Hints" className="m-0 my-4 grid list-none gap-[0.6rem] p-0">
        {hints.slice(0, shown).map((hint, index) => (
          <Hint key={index} number={index + 1} text={hint} reveal={index > 0} />
        ))}
      </ol>
      <p className="sr-only" aria-live="polite">
        {shown > 1 ? `Hint ${shown} of ${hints.length} shown.` : ''}
      </p>
      <div className="flex flex-wrap items-start gap-[0.6rem]">
        {left > 0 && (
          <Button variant={plate ? 'plate' : 'outline'} onClick={() => setShown((count) => count + 1)}>
            Next hint <span className="num">({left} left)</span>
          </Button>
        )}
        {actions}
      </div>
    </>
  );
};
