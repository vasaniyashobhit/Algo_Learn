import { useAuth } from '../../hooks/useAuth.js';
import { statTiles } from '../../lib/dashboardData.js';
import { rankFor } from '../../lib/ratingRank.js';
import { ParallaxLayer } from '../motion/ParallaxLayer.jsx';
import { LastSynced } from './LastSynced.jsx';
import { StatTiles } from './StatTiles.jsx';
import { SyncButton } from './SyncButton.jsx';
import { UnlinkHandle } from './UnlinkHandle.jsx';

// The board's content lags the scroll slightly; the chalk surface itself stays put (transform only).
const BOARD_DEPTH = 0.12;

/**
 * The chalk scoreboard across the top: handle, rank and sync time, the figures (when there
 * are stats), and the sync / unlink controls. `summary` is the stats summary answer.
 */
export const DashboardHeader = ({ summary, showTiles = true }) => {
  const { user } = useAuth();
  const handle = user?.cfHandle ?? summary.meta.cfHandle;
  const rating = user?.cfRating ?? summary.meta.cfRating ?? null;
  const rank = rankFor(rating) ?? 'No rated contest yet';

  return (
    <section aria-labelledby="board-title" className="on-chalk overflow-hidden bg-chalk text-chalk-ink shadow-panel">
      <ParallaxLayer depth={BOARD_DEPTH} className="wrap flex flex-wrap items-end gap-x-10 gap-y-5 py-6">
        <div className="mr-auto min-w-0">
          <h1 id="board-title" className="m-0 truncate text-step-3">
            {handle}
          </h1>
          <p className="m-0 mt-1 opacity-80">
            {rank} · <LastSynced at={user?.lastSyncedAt ?? summary.meta.lastSyncedAt} />
          </p>
          <p className="caption m-0 mt-3 text-current opacity-75">Your numbers · Scoreboard</p>
        </div>
        {showTiles && <StatTiles tiles={statTiles(summary.data, { cfRating: rating })} />}
        <div className="flex flex-wrap items-center gap-3">
          <SyncButton />
          <UnlinkHandle handle={handle} />
        </div>
      </ParallaxLayer>
    </section>
  );
};
