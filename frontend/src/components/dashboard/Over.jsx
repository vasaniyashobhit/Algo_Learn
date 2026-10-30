import { cn } from '../../lib/cn.js';
import { ballText, formatDay } from '../../lib/overs.js';

const BALL = 'grid size-8 place-items-center rounded-full font-display text-[1.1rem] font-bold';
const KINDS = {
  dot: 'bg-band-2',
  wicket: 'bg-transparent text-miss shadow-[inset_0_0_0_2px_var(--miss)]',
  runs: 'bg-band-2 text-ink',
};
// The best day is inverted (ink on ground), never plate: the plate belongs to the screen's next action.
const BEST = 'bg-ink text-ground';

const BallFace = ({ kind, value }) => {
  if (kind === 'runs') return <span className="num">{value}</span>;
  if (kind === 'wicket') return 'W';
  return <span className="size-[5px] rounded-full bg-ink-soft" />;
};

/** Six days as six balls. Decorative for screen readers; ActivityTable has the same data. */
export const Over = ({ balls, best }) => (
  <ol className="m-0 flex list-none gap-[0.35rem] border-r border-line p-0 pr-4 last:border-r-0">
    {balls.map((ball) => (
      <li
        key={ball.date}
        title={`${formatDay(ball.date)}: ${ballText(ball)}`}
        className={cn(BALL, ball.kind === 'runs' && ball.value === best ? BEST : KINDS[ball.kind])}
      >
        <BallFace {...ball} />
      </li>
    ))}
  </ol>
);
