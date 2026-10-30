import { useTopicStatsQuery } from '../../hooks/queries/stats.queries.js';
import { PAIR_MIN_ATTEMPTED, pairInsights } from '../../lib/pairs.js';
import { PanelHeading } from '../ui/PanelHeading.jsx';
import { QueryState } from '../ui/QueryState.jsx';
import { PairList } from './PairList.jsx';
import { PanelSkeleton } from './PanelSkeleton.jsx';

export const PAIR_PARAMS = { kind: 'pair', sort: 'attempted', limit: 100 };

/** Topic pairs: the combinations that fall apart together and the ones that hold ("Partnerships"). */
export const PairInsights = () => {
  const query = useTopicStatsQuery(PAIR_PARAMS);
  return (
    <section aria-labelledby="pairs-title" className="bg-ground p-5">
      <PanelHeading id="pairs-title" title="Topic pairs" caption="Partnerships" />
      <QueryState
        query={query}
        skeleton={<PanelSkeleton label="Loading topic pairs" />}
        errorTitle="Topic pairs didn't load"
        isEmpty={(answer) => pairInsights(answer.data).eligible === 0}
        empty={
          <p className="text-ink-soft">
            No pairs yet. A pair such as dp + bitmasks counts once you have tried {PAIR_MIN_ATTEMPTED} problems that
            use both topics.
          </p>
        }
      >
        {(answer) => {
          const { weak, strong } = pairInsights(answer.data);
          return (
            <div className="grid gap-5">
              <PairList id="pairs-weak" title="Struggle together" pairs={weak} weak />
              <PairList id="pairs-strong" title="Hold up together" pairs={strong} />
            </div>
          );
        }}
      </QueryState>
    </section>
  );
};
