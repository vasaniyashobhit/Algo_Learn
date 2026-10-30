import { formatStrength, solvedText, topicLabel } from '../../lib/strength.js';
import { StaggerItem } from '../motion/StaggerItem.jsx';
import { StaggerList } from '../motion/StaggerList.jsx';

/** One group of topic pairs ("Struggle together" / "Hold up together") with strength and record. */
export const PairList = ({ id, title, pairs, weak = false }) => {
  if (pairs.length === 0) return null;
  return (
    <div>
      <h3 id={id} className="label m-0 mb-2 text-[0.85rem] tracking-[0.1em] text-ink-soft">
        {title}
      </h3>
      <StaggerList as="ul" aria-labelledby={id} className="m-0 grid list-none gap-px p-0">
        {pairs.map((pair) => (
          <StaggerItem key={pair.topicKey} className="flex items-baseline gap-3 bg-band px-3 py-2">
            <span className="min-w-0 flex-1 font-display text-step-lead font-bold uppercase">{topicLabel(pair.topicKey)}</span>
            <span className={`fig text-step-1 ${weak ? 'text-miss' : ''}`}>{formatStrength(pair.strength)}</span>
            <span className="text-step--1 whitespace-nowrap text-ink-soft">{solvedText(pair)}</span>
          </StaggerItem>
        ))}
      </StaggerList>
    </div>
  );
};
