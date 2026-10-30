import { ActivityStrip } from './ActivityStrip.jsx';
import { PairInsights } from './PairInsights.jsx';
import { TopicRadar } from './TopicRadar.jsx';
import { WeakTopics } from './WeakTopics.jsx';

/** The synced dashboard: three panels ruled like a scorecard, then the 30-day strip. */
export const DashboardPanels = () => (
  <>
    <div className="mt-8 grid gap-px border border-line bg-line lg:grid-cols-[1.1fr_1.15fr_0.95fr]">
      <TopicRadar />
      <WeakTopics />
      <PairInsights />
    </div>
    <ActivityStrip />
  </>
);
