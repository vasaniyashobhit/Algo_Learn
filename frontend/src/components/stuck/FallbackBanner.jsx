import { FALLBACK_COPY } from '../../lib/stuckLabels.js';
import { Button } from '../ui/Button.jsx';
import { Notice } from '../ui/Notice.jsx';

/**
 * The plate strap on a fallback result: why there is no AI answer, what is shown instead, and a
 * way to ask again (which costs one of the 10 hourly requests). This is the screen's one plate.
 */
export const FallbackBanner = ({ reason }) => (
  <Notice
    tone="plate"
    className="on-plate"
    action={
      <Button variant="onPlate" to="/stuck">
        Ask again
      </Button>
    }
  >
    <p>
      <b>{FALLBACK_COPY[reason] ?? 'AI hints are unavailable right now.'}</b> Meanwhile: the likely topics, your weak
      spots, warm-up problems and the editorial, all without AI. Asking again uses one of your 10 requests this hour.
    </p>
  </Notice>
);
