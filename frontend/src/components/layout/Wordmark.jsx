import { Link } from 'react-router';

/** The AlgoLearn plate wordmark. It is chrome, so it does not count as the screen's one plate. */
export const Wordmark = ({ to = '/' }) => (
  <Link
    to={to}
    className="flex items-center bg-plate px-[0.9rem] font-display text-[1.35rem] leading-none font-extrabold tracking-[0.02em] text-plate-ink uppercase no-underline"
  >
    Algo<span className="font-medium">Learn</span>
  </Link>
);
