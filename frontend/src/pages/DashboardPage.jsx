import { DashboardPanels } from '../components/dashboard/DashboardPanels.jsx';
import { DashboardTop } from '../components/dashboard/DashboardTop.jsx';
import { RecommendationsSection } from '../components/recommendations/RecommendationsSection.jsx';
import { statsReason, useStatsSummaryQuery } from '../hooks/queries/stats.queries.js';
import { usePageTitle } from '../hooks/usePageTitle.js';

/**
 * Signed-in home. One plate per screen: the handle hero without a handle, the first-sync
 * notice before the first sync, otherwise the lead next topic.
 */
export const DashboardPage = () => {
  usePageTitle('Dashboard');
  const summary = useStatsSummaryQuery();
  const reason = statsReason(summary);
  const synced = summary.isSuccess && reason === null;

  return (
    <div className="pb-16">
      <DashboardTop summary={summary} reason={reason} />
      <div className="wrap">
        {synced && <DashboardPanels />}
        <RecommendationsSection plateLead={synced} />
      </div>
    </div>
  );
};
