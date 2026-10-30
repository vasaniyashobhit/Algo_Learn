import { useLocation } from 'react-router';
import { StuckForm } from '../components/stuck/StuckForm.jsx';
import { usePageTitle } from '../hooks/usePageTitle.js';

/** /stuck: bring the problem you are stuck on. "I'm stuck on this" on a problem page pre-fills the link. */
export const StuckPage = () => {
  usePageTitle("I'm stuck");
  const { state } = useLocation();
  return (
    <div className="wrap grid items-start gap-12 pt-12 pb-16 lg:grid-cols-[0.8fr_1.2fr]">
      <div>
        <h1 className="text-[clamp(2.6rem,5vw,5.6rem)] leading-[0.92]">Stuck? Bring the problem.</h1>
        <p className="text-ink-soft">
          Hints first, one at a time. Then the concept you are missing, and easier problems on it. The full solution
          waits until you ask for it.
        </p>
        <p className="mt-6 border-t border-line pt-4 text-step--1 text-ink-soft">
          <b className="text-ink">For practice and upsolving only.</b> Never use this during a live rated contest or an
          assessment: finish the round first, then come back.
        </p>
      </div>
      <StuckForm initialUrl={state?.url ?? ''} />
    </div>
  );
};
