import { Button } from '../ui/Button.jsx';

/** The page's close. The hero holds this screen's plate, so this action is an outline. */
export const ClosingCall = () => (
  <>
    <section
      className="wrap flex flex-col items-start justify-between gap-4 pt-16 md:flex-row md:items-center"
      aria-label="Get started"
    >
      <p className="m-0 font-display text-step-2 leading-none font-bold uppercase">
        Next problem, right difficulty, ready when you are.
      </p>
      <Button variant="outline" to="/signup">
        Create a free account
      </Button>
    </section>
    <p className="wrap mt-12 mb-16 max-w-none border-t border-line pt-4 text-step--1 text-ink-soft">
      AlgoLearn is an independent tool that uses public Codeforces data. Figures on this page are sample data.
    </p>
  </>
);
