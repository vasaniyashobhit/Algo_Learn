import { cn } from '../../lib/cn.js';
import { CountUp } from '../motion/CountUp.jsx';
import { StaggerItem } from '../motion/StaggerItem.jsx';
import { StaggerList } from '../motion/StaggerList.jsx';

const TileValue = ({ value }) =>
  value === null ? (
    <>
      <span aria-hidden="true">–</span>
      <span className="sr-only">No rating yet</span>
    </>
  ) : (
    <CountUp value={value} />
  );

/** The scoreboard figures: plain labels over big tabular numbers that count up once. */
export const StatTiles = ({ tiles }) => (
  <StaggerList as="dl" aria-label="Your numbers" className="m-0 flex flex-wrap gap-x-9 gap-y-4">
    {tiles.map(({ key, label, value }, index) => (
      <StaggerItem
        as="div"
        key={key}
        className={cn(index === 0 && 'border-r-[3px] border-current pr-9')}
        data-testid={`tile-${key}`}
      >
        <dt className="label text-[0.8rem] tracking-[0.1em] opacity-75">{label}</dt>
        <dd className="fig m-0 text-step-3 leading-[0.95]">
          <TileValue value={value} />
        </dd>
      </StaggerItem>
    ))}
  </StaggerList>
);
