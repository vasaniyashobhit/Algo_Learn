import { useStatsSummaryQuery } from '../../hooks/queries/stats.queries.js';
import { LEVEL_LABELS, formatStrength, strengthLevel } from '../../lib/strength.js';
import { StaggerItem } from '../motion/StaggerItem.jsx';
import { StaggerList } from '../motion/StaggerList.jsx';
import { PanelHeading } from '../ui/PanelHeading.jsx';
import { QueryState } from '../ui/QueryState.jsx';
import { PanelSkeleton } from './PanelSkeleton.jsx';

const HEAD = 'label border-b border-line pb-2 text-right text-[0.8rem] tracking-[0.1em] text-ink-soft';
const CELL = 'border-b border-line py-[0.55rem] text-right whitespace-nowrap';

const WeakTable = ({ rows }) => (
  <table aria-labelledby="weak-title" className="w-full border-collapse">
    <thead>
      <tr>
        <th scope="col" className={`${HEAD} text-left`}>
          Topic
        </th>
        <th scope="col" className={HEAD}>
          Strength (0–1)
        </th>
        <th scope="col" className={HEAD}>
          Solved / tried
        </th>
      </tr>
    </thead>
    <StaggerList as="tbody">
      {rows.map((row) => {
        const weak = strengthLevel(row.strength) === 'weak';
        return (
          <StaggerItem as="tr" key={row.topicKey}>
            <th scope="row" className="border-b border-line py-[0.55rem] text-left font-display text-[1.15rem] font-bold uppercase">
              {row.topicKey}
            </th>
            <td className={CELL}>
              <span className={`fig text-[1.3rem] ${weak ? 'text-miss' : ''}`}>{formatStrength(row.strength)}</span>{' '}
              <span className="text-step--1 text-ink-soft">{LEVEL_LABELS[strengthLevel(row.strength)]}</span>
            </td>
            <td className={`${CELL} num`}>
              {row.solved}/{row.attempted}
            </td>
          </StaggerItem>
        );
      })}
    </StaggerList>
  </table>
);

/** The five weakest single topics with at least 3 attempted problems ("Batting card"). */
export const WeakTopics = () => {
  const query = useStatsSummaryQuery();
  return (
    <section aria-labelledby="weak-title" className="bg-ground p-5">
      <PanelHeading id="weak-title" title="Weak topics" caption="Batting card" />
      <QueryState
        query={query}
        skeleton={<PanelSkeleton label="Loading weak topics" />}
        errorTitle="Weak topics didn't load"
        isEmpty={(answer) => answer.data.weakest.length === 0}
        empty={
          <p className="text-ink-soft">
            Nothing flagged yet. A topic is judged once you have tried 3 problems in it, so one unlucky attempt never
            counts as weak.
          </p>
        }
      >
        {(answer) => <WeakTable rows={answer.data.weakest} />}
      </QueryState>
    </section>
  );
};
