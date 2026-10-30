import { useId, useState } from 'react';
import { useTopicStatsQuery } from '../../hooks/queries/stats.queries.js';
import { RADAR_TOPICS, radarRows, radarSummary } from '../../lib/dashboardData.js';
import { PanelHeading } from '../ui/PanelHeading.jsx';
import { QueryState } from '../ui/QueryState.jsx';
import { TableToggle } from '../ui/TableToggle.jsx';
import { PanelSkeleton } from './PanelSkeleton.jsx';
import { TopicRadarChart } from './TopicRadarChart.jsx';
import { TopicTable } from './TopicTable.jsx';

export const RADAR_PARAMS = { kind: 'single', sort: 'attempted', limit: RADAR_TOPICS };
// A polygon needs at least three corners; with fewer topics the table says it better.
const MIN_RADAR_TOPICS = 3;

const RadarBody = ({ rows }) => {
  const tableId = useId();
  const [showTable, setShowTable] = useState(rows.length < MIN_RADAR_TOPICS);
  const canChart = rows.length >= MIN_RADAR_TOPICS;
  return (
    <>
      <PanelHeading
        id="radar-title"
        title="Topic strength"
        caption="Wagon wheel"
        action={canChart && <TableToggle showTable={showTable} controls={tableId} onToggle={() => setShowTable((v) => !v)} />}
      />
      {canChart && <TopicRadarChart rows={rows} label={radarSummary(rows)} hidden={showTable} />}
      <TopicTable id={tableId} rows={rows} hidden={!showTable} />
      <p className="mt-3 mb-0 text-step--1 text-ink-soft">Your {rows.length} most practised topics. 0.50 means no data yet.</p>
    </>
  );
};

const RadarEmpty = () => (
  <>
    <PanelHeading id="radar-title" title="Topic strength" caption="Wagon wheel" />
    <p className="text-ink-soft">
      No topics yet. Attempt a problem on Codeforces and sync: every topic appears after its first attempt.
    </p>
  </>
);

/** The panel: the 8 most practised topics as a radar, with a table alternative. */
export const TopicRadar = () => {
  const query = useTopicStatsQuery(RADAR_PARAMS);
  return (
    <section aria-labelledby="radar-title" className="bg-ground p-5">
      <QueryState
        query={query}
        skeleton={<PanelSkeleton label="Loading topic strength" shape="wheel" />}
        errorTitle="Topic strength didn't load"
        isEmpty={(answer) => answer.data.length === 0}
        empty={<RadarEmpty />}
      >
        {(answer) => <RadarBody rows={radarRows(answer.data)} />}
      </QueryState>
    </section>
  );
};
