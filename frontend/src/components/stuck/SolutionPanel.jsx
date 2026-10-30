import { useState } from 'react';
import { useStuckSolutionQuery } from '../../hooks/queries/stuck.queries.js';
import { solutionButtonLabel } from '../../lib/stuckLabels.js';
import { FadeIn } from '../motion/FadeIn.jsx';
import { Button } from '../ui/Button.jsx';
import { QueryState } from '../ui/QueryState.jsx';
import { SolutionBody } from './SolutionBody.jsx';
import { SolutionSkeleton } from './SolutionSkeleton.jsx';

const PANEL_ID = 'stuck-solution';

// Mounted only when opened, so GET /stuck/:id/solution is requested on demand (then cached).
const SolutionContent = ({ id }) => {
  const query = useStuckSolutionQuery(id);
  return (
    <QueryState
      query={query}
      skeleton={<SolutionSkeleton />}
      errorTitle="The solution didn't load"
      errorContext="stuck"
    >
      {(data) => <SolutionBody data={data} />}
    </QueryState>
  );
};

/**
 * "Show full solution": a deliberate extra step after the hints. Toggles open and closed.
 * Renders the button and, when open, the panel as siblings: in a flex-wrap row (the hint
 * actions) the panel takes the full width below the buttons.
 */
export const SolutionPanel = ({ result }) => {
  const [open, setOpen] = useState(false);
  const label = solutionButtonLabel(result);
  return (
    <>
      <Button variant="outline" aria-expanded={open} aria-controls={PANEL_ID} onClick={() => setOpen((value) => !value)}>
        {open ? 'Hide solution' : label}
      </Button>
      {open && (
        <FadeIn id={PANEL_ID} className="mt-2 basis-full bg-band px-[1.2rem] py-[1.1rem] shadow-[inset_0_3px_0_var(--ink)]">
          <SolutionContent id={result.id} />
        </FadeIn>
      )}
    </>
  );
};
