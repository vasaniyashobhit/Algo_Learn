import { hintsCaption } from '../../lib/stuckLabels.js';
import { Button } from '../ui/Button.jsx';
import { ConceptGap } from './ConceptGap.jsx';
import { FallbackBanner } from './FallbackBanner.jsx';
import { HintList } from './HintList.jsx';
import { ResultHeader } from './ResultHeader.jsx';
import { SolutionPanel } from './SolutionPanel.jsx';
import { WarmUp } from './WarmUp.jsx';

/**
 * A stuck result. Hints first (one at a time), then the full solution on request; the concept
 * gap and warm-up problems sit beside them. A fallback result puts its notice on the plate.
 */
export const StuckResult = ({ result }) => {
  const fallback = result.source === 'fallback';
  return (
    <>
      <ResultHeader result={result} />
      <div className="wrap grid items-start gap-10 pt-8 pb-16 lg:grid-cols-[1.4fr_1fr]">
        {fallback && (
          <div className="lg:col-span-2">
            <FallbackBanner reason={result.fallbackReason} />
          </div>
        )}
        <section aria-labelledby="hints-title">
          <h2 id="hints-title" className="text-ink-soft">
            Hints
          </h2>
          <p className="m-0 text-step--1 text-ink-soft">{hintsCaption(result)}</p>
          <HintList hints={result.hints} plate={!fallback} actions={<SolutionPanel result={result} />} />
        </section>
        <aside aria-label="Concept gap and similar problems" className="grid gap-8">
          <ConceptGap gap={result.gap} />
          <WarmUp similar={result.similar} />
        </aside>
        <p className="m-0 text-step--1 text-ink-soft lg:col-span-2">
          Practice and upsolving only.{' '}
          <Button variant="text" to="/stuck" className="inline-flex">
            Ask about another problem
          </Button>
        </p>
      </div>
    </>
  );
};
