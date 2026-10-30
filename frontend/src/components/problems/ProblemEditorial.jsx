import { useState } from 'react';
import { FadeIn } from '../motion/FadeIn.jsx';
import { Button } from '../ui/Button.jsx';
import { Markdown } from '../ui/Markdown.jsx';

/** The editorial stays folded: reading it is a deliberate step, like the full solution. */
export const ProblemEditorial = ({ text }) => {
  const [open, setOpen] = useState(false);
  return (
    <section aria-labelledby="editorial-title" className="mt-8 border-t border-line pt-5">
      <h2 id="editorial-title" className="text-ink-soft">
        Editorial
      </h2>
      <p className="text-step--1 text-ink-soft">Stuck? Try the hints first: they show the idea without the answer.</p>
      <Button variant="outline" aria-expanded={open} aria-controls="problem-editorial" onClick={() => setOpen((value) => !value)}>
        {open ? 'Hide editorial' : 'Show editorial'}
      </Button>
      {open && (
        <FadeIn id="problem-editorial" className="mt-4">
          <Markdown>{text}</Markdown>
        </FadeIn>
      )}
    </section>
  );
};
