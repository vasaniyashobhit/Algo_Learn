import { Link } from 'react-router';
import { formatWhen } from '../../lib/formatters.js';
import { historyLabel } from '../../lib/historyCache.js';
import { ANSWER_LABELS, INPUT_LABELS, stuckProblemId, stuckTitle } from '../../lib/stuckLabels.js';
import { topicLabel } from '../../lib/strength.js';
import { StaggerItem } from '../motion/StaggerItem.jsx';
import { Button } from '../ui/Button.jsx';
import { Tag } from '../ui/Tag.jsx';

const CELL = 'border-b border-line px-2 py-[0.65rem] align-middle';

/** One past stuck query: when, which problem (opens the result), input, answer type, gap, delete. */
export const HistoryRow = ({ item, onDelete }) => {
  const id = stuckProblemId(item.problem);
  return (
    <StaggerItem as="tr">
      <td className={`${CELL} num whitespace-nowrap text-ink-soft`}>
        <time dateTime={item.createdAt}>{formatWhen(item.createdAt)}</time>
      </td>
      <td className={CELL}>
        <Link to={`/stuck/${item.id}`} className="group no-underline">
          <b className="line-clamp-2 max-w-[38ch] font-display text-step-1 uppercase [overflow-wrap:anywhere] group-hover:underline" title={stuckTitle(item.problem)}>
            {stuckTitle(item.problem)}
          </b>
          {id && (
            <>
              {' '}
              <span className="num text-ink-soft">{id}</span>
            </>
          )}
        </Link>
      </td>
      <td className={CELL}>{INPUT_LABELS[item.inputType] ?? item.inputType}</td>
      <td className={CELL}>{ANSWER_LABELS[item.source] ?? item.source}</td>
      <td className={CELL}>
        {item.gapTopics?.length ? (
          <span className="flex flex-wrap gap-1">
            {item.gapTopics.map((topic) => (
              <Tag key={topic} tone="gap">
                {topicLabel(topic)}
              </Tag>
            ))}
          </span>
        ) : (
          <span className="text-step--1 text-ink-soft">No gap</span>
        )}
      </td>
      <td className={`${CELL} text-right`}>
        <Button variant="text" aria-label={`Delete ${historyLabel(item)} from your history`} onClick={() => onDelete(item)}>
          Delete
        </Button>
      </td>
    </StaggerItem>
  );
};
