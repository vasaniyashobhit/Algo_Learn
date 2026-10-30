import { formatStrength, topicLabel } from '../../lib/strength.js';
import { GAP_STATUS_LABELS } from '../../lib/stuckLabels.js';
import { StaggerItem } from '../motion/StaggerItem.jsx';
import { StrengthBar } from '../ui/StrengthBar.jsx';

/** One concept-gap topic: name, strength (or a dash when never practised), its word and bar. */
export const GapCard = ({ item }) => {
  const unseen = item.status === 'unseen' || item.strength === null;
  return (
    <StaggerItem className="grid content-start gap-2 bg-band p-[0.8rem]">
      <h3 className="label m-0 text-[0.9rem] text-ink-soft">{topicLabel(item.topicKey)}</h3>
      <p className="m-0 flex items-baseline gap-2">
        <span className="fig text-[2.4rem] leading-none text-miss">{unseen ? '–' : formatStrength(item.strength)}</span>
        <span className="text-step--1">
          {GAP_STATUS_LABELS[item.status] ?? item.status}
          {!unseen && <span className="sr-only"> (strength out of 1)</span>}
        </span>
      </p>
      <StrengthBar value={unseen ? null : item.strength} />
      <p className="m-0 text-step--1 text-ink-soft">{item.message}</p>
    </StaggerItem>
  );
};
