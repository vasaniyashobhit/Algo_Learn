import { cn } from '../../lib/cn.js';
import { ADDED_FROM_LABELS, STATUS_LABELS } from '../../lib/practiceCache.js';
import { codeforcesUrl, ratingText } from '../../lib/problemLinks.js';
import { StaggerItem } from '../motion/StaggerItem.jsx';
import { Mark } from '../ui/Mark.jsx';
import { Tag } from '../ui/Tag.jsx';
import { StatusActions } from './StatusActions.jsx';

const SHAPES = { todo: 'open', solved: 'solved', skipped: 'skipped' };
const CELL = 'border-b border-line px-2 py-[0.65rem] align-middle';

const ProblemCell = ({ item }) => {
  if (!item.problem) return <span className="text-ink-soft">{item.problemId} (no longer in our problem set)</span>;
  return (
    <a href={codeforcesUrl(item.problem)} target="_blank" rel="noopener noreferrer" className="group no-underline">
      <b className="font-display text-[1.15rem] uppercase group-hover:underline">{item.problem.title}</b>{' '}
      <span className="num text-ink-soft">{item.problemId}</span>
      <span className="sr-only"> (opens on Codeforces in a new tab)</span>
    </a>
  );
};

/** One practice item as a table row: state mark, rating, problem, topics, source and actions. */
export const PracticeRow = ({ item }) => (
  <StaggerItem as="tr" className={cn(item.status !== 'todo' && 'text-ink-soft', item.optimistic && 'opacity-70')}>
    <td className={CELL}>
      <Mark shape={SHAPES[item.status]} label={STATUS_LABELS[item.status]} />
    </td>
    <td className={cn(CELL, 'fig text-[1.6rem] text-plate-text')}>{ratingText(item.problem?.rating)}</td>
    <td className={CELL}>
      <ProblemCell item={item} />
    </td>
    <td className={CELL}>
      <span className="flex flex-wrap gap-1">
        {(item.problem?.tags ?? []).map((tag) => (
          <Tag key={tag}>{tag}</Tag>
        ))}
      </span>
    </td>
    <td className={cn(CELL, 'text-step--1 text-ink-soft')}>{ADDED_FROM_LABELS[item.addedFrom] ?? item.addedFrom}</td>
    <td className={CELL}>
      <StatusActions item={item} />
    </td>
  </StaggerItem>
);
